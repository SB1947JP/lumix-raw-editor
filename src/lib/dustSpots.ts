import { DecodedImage, DustSpot } from '../types';

/** Hard ceiling on how many spots are kept, and the size of the shader's
 *  uniform array — the two must stay equal (see adjust.frag.glsl's MAX_DUST). */
export const MAX_DUST_SPOTS = 32;

/** Long edge the detector works at. Sensor dust is a *blob*, not fine detail,
 *  so there's nothing to gain from scanning a 3000px preview pixel by pixel —
 *  downsampling first makes the whole scan a few milliseconds and, more
 *  usefully, averages away the per-pixel noise that would otherwise fragment
 *  a spot into a dozen tiny components. */
const WORK_LONG_EDGE = 1400;

interface WorkImage {
  luma: Float32Array;
  /** Interleaved RGB in 0..1, kept alongside luma for the neutrality test. */
  rgb: Float32Array;
  width: number;
  height: number;
}

/** Box-average downsample to luma + RGB planes in 0..1. */
function toWorkingImage(image: DecodedImage): WorkImage {
  const { width, height, data, bitsPerSample } = image;
  const shift = bitsPerSample === 16 ? 8 : 0;
  const step = Math.max(1, Math.round(Math.max(width, height) / WORK_LONG_EDGE));
  const w = Math.max(1, Math.floor(width / step));
  const h = Math.max(1, Math.floor(height / step));
  const luma = new Float32Array(w * h);
  const rgb = new Float32Array(w * h * 3);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let n = 0;
      for (let sy = 0; sy < step; sy++) {
        const py = y * step + sy;
        if (py >= height) break;
        for (let sx = 0; sx < step; sx++) {
          const px = x * step + sx;
          if (px >= width) break;
          const o = (py * width + px) * 3;
          sumR += data[o] >> shift;
          sumG += data[o + 1] >> shift;
          sumB += data[o + 2] >> shift;
          n++;
        }
      }
      const i = y * w + x;
      const r = sumR / n / 255;
      const g = sumG / n / 255;
      const b = sumB / n / 255;
      rgb[i * 3] = r;
      rgb[i * 3 + 1] = g;
      rgb[i * 3 + 2] = b;
      luma[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }
  return { luma, rgb, width: w, height: h };
}

/** Separable box blur with clamped edges, via a running sum (O(n) in radius). */
function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const window = radius * 2 + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = src[row] * (radius + 1);
    for (let x = 1; x <= radius; x++) sum += src[row + Math.min(x, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / window;
      sum += src[row + Math.min(x + radius + 1, w - 1)] - src[row + Math.max(x - radius, 0)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = tmp[x] * (radius + 1);
    for (let y = 1; y <= radius; y++) sum += tmp[Math.min(y, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / window;
      sum += tmp[Math.min(y + radius + 1, h - 1) * w + x] - tmp[Math.max(y - radius, 0) * w + x];
    }
  }
  return out;
}

/** Mean and standard deviation of the ring around a candidate — the test for
 *  "is this sitting in a smooth area?", which is what separates a dust spot on
 *  a sky from a dark detail inside a busy subject. */
function annulusStats(work: WorkImage, cx: number, cy: number, rInner: number, rOuter: number) {
  const { luma, rgb, width: w, height: h } = work;
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  const channels = [0, 0, 0];
  const x0 = Math.max(0, Math.floor(cx - rOuter));
  const x1 = Math.min(w - 1, Math.ceil(cx + rOuter));
  const y0 = Math.max(0, Math.floor(cy - rOuter));
  const y1 = Math.min(h - 1, Math.ceil(cy + rOuter));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < rInner || d > rOuter) continue;
      const i = y * w + x;
      const v = luma[i];
      sum += v;
      sumSq += v * v;
      channels[0] += rgb[i * 3];
      channels[1] += rgb[i * 3 + 1];
      channels[2] += rgb[i * 3 + 2];
      n++;
    }
  }
  if (n === 0) return { n: 0, mean: 0, sd: 0, rgb: channels };
  const mean = sum / n;
  return {
    n,
    mean,
    sd: Math.sqrt(Math.max(0, sumSq / n - mean * mean)),
    rgb: [channels[0] / n, channels[1] / n, channels[2] / n],
  };
}

interface Candidate {
  x: number;
  y: number;
  r: number;
  strength: number;
}

/**
 * Finds sensor-dust spots: small, roughly round patches that are *darker than
 * their own surroundings* and sit in a smooth, reasonably bright area.
 *
 * The detector is deliberately conservative. A false negative costs the user a
 * spot they can still see; a false positive silently smears away a bird, a
 * mole, or an eye — so every candidate has to clear all of size, roundness,
 * contrast and local-smoothness before it is accepted. That is also why only
 * bright regions are considered: dust is only actually visible against open
 * sky and other flat, light areas, and looking for it in shadows and busy
 * texture is where the destructive mistakes come from.
 */
export function detectDustSpots(image: DecodedImage): DustSpot[] {
  const work = toWorkingImage(image);
  const { luma, rgb, width: w, height: h } = work;

  // Spot geometry, in working-scale pixels. Sensor dust is *small* — a mote
  // sitting on the sensor stack casts a shadow well under 1% of the frame
  // width. Allowing more than that is what lets a soft cloud edge in.
  const maxRadius = Math.max(3, Math.round(w * 0.008));
  const minArea = 6;
  const maxArea = Math.PI * maxRadius * maxRadius;

  // The background estimate has to average over a window several times wider
  // than the biggest spot, or the spot drags its own background down with it
  // and erases the very difference being measured.
  const background = boxBlur(luma, w, h, Math.max(6, maxRadius * 3));

  // A dust spot is a *faint* local darkening: a mote on the sensor stack sits
  // millimetres in front of the photosites and is nowhere near focus, so it
  // dims the light rather than blocking it — a few percent, never more than
  // ~12%. The upper bound is doing as much work as the lower one here: a bird,
  // a twig or a dark tuft of grass is far darker than its surroundings, and
  // capping contrast is what keeps those from being quietly erased.
  const MIN_ABS_CONTRAST = 0.01;
  const MAX_ABS_CONTRAST = 0.12;
  const MIN_REL_CONTRAST = 0.02;
  const MAX_REL_CONTRAST = 0.2;
  // Dust is only visible against a bright, open background. Requiring one is
  // the single most effective false-positive filter there is.
  const MIN_BACKGROUND = 0.3;
  // The surroundings must be genuinely flat — sky, a wall, still water. This
  // threshold is what separates a spot on open sky from an identical-looking
  // dark speck sitting in grass or foliage.
  const MAX_RING_SD = 0.012;
  // ...and the spot must stand clear of whatever variation the ring does have,
  // so texture that happens to be locally smooth can't sneak a candidate past.
  const MIN_CONTRAST_OVER_SD = 3;
  // Dust blocks all wavelengths about equally, so its shadow is neutral: the
  // R, G and B channels all drop by the same *proportion*. Real subject matter
  // almost never does that. This is the one test that is grounded in the
  // physics of what dust is rather than in what it tends to look like.
  const MAX_NEUTRAL_DEVIATION = 0.03;

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    const bg = background[i];
    if (bg < MIN_BACKGROUND) continue;
    const d = bg - luma[i];
    if (d < MIN_ABS_CONTRAST || d < bg * MIN_REL_CONTRAST) continue;
    if (d > MAX_ABS_CONTRAST || d > bg * MAX_REL_CONTRAST) continue;
    mask[i] = 1;
  }

  // Flood-fill the mask into components (8-connected, explicit stack — a
  // recursive fill blows the JS stack on a large blob).
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const candidates: Candidate[] = [];

  for (let seed = 0; seed < mask.length; seed++) {
    if (!mask[seed] || visited[seed]) continue;
    visited[seed] = 1;
    stack.length = 0;
    stack.push(seed);

    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let sumLuma = 0;
    const sumRgb = [0, 0, 0];
    let minX = w;
    let maxX = -1;
    let minY = h;
    let maxY = -1;

    while (stack.length > 0) {
      const p = stack.pop()!;
      const px = p % w;
      const py = (p - px) / w;
      count++;
      sumX += px;
      sumY += py;
      sumLuma += luma[p];
      sumRgb[0] += rgb[p * 3];
      sumRgb[1] += rgb[p * 3 + 1];
      sumRgb[2] += rgb[p * 3 + 2];
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;

      for (let ny = Math.max(0, py - 1); ny <= Math.min(h - 1, py + 1); ny++) {
        for (let nx = Math.max(0, px - 1); nx <= Math.min(w - 1, px + 1); nx++) {
          const q = ny * w + nx;
          if (mask[q] && !visited[q]) {
            visited[q] = 1;
            stack.push(q);
          }
        }
      }
      // A runaway region (a whole shaded hillside) can't be dust — stop
      // growing it rather than walking the entire frame.
      if (count > maxArea * 4) break;
    }

    if (count < minArea || count > maxArea) continue;

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    // Round: a mote's out-of-focus shadow is close to circular, so neither
    // axis should exceed the other by much, and the blob has to actually fill
    // its own bounding box (a thin branch or a wisp of cloud does not).
    if (bw > bh * 1.6 || bh > bw * 1.6) continue;
    if (count / (bw * bh) < 0.6) continue;

    const cx = sumX / count;
    const cy = sumY / count;
    const radius = Math.max(1.2, Math.sqrt(count / Math.PI));
    if (radius > maxRadius) continue;

    // The surroundings must be smooth, and genuinely lighter than the spot.
    const ring = annulusStats(work, cx, cy, radius * 1.6, radius * 3);
    if (ring.n < 12) continue;
    const spotLuma = sumLuma / count;
    const contrast = ring.mean - spotLuma;
    if (contrast < MIN_ABS_CONTRAST || contrast > MAX_ABS_CONTRAST) continue;
    if (contrast > ring.mean * MAX_REL_CONTRAST) continue;
    if (ring.sd > MAX_RING_SD) continue;
    if (contrast < ring.sd * MIN_CONTRAST_OVER_SD) continue;

    // Neutral-shadow test: each channel must be dimmed by the same fraction.
    // A grey mote gives three near-identical ratios; anything with a colour of
    // its own (foliage, a bird, a shadow on skin) does not.
    let maxRatio = -Infinity;
    let minRatio = Infinity;
    for (let c = 0; c < 3; c++) {
      const ringC = ring.rgb[c];
      if (ringC < 1e-3) {
        maxRatio = Infinity;
        break;
      }
      const ratio = sumRgb[c] / count / ringC;
      if (ratio > maxRatio) maxRatio = ratio;
      if (ratio < minRatio) minRatio = ratio;
    }
    if (maxRatio - minRatio > MAX_NEUTRAL_DEVIATION) continue;

    candidates.push({
      x: cx / w,
      y: cy / h,
      // Padded: dust has a soft, out-of-focus edge that reaches past the
      // thresholded core, and the shader feathers the outermost 15% back to
      // the original pixels anyway.
      r: (radius * 1.45) / w,
      strength: contrast * Math.sqrt(count),
    });
  }

  return candidates
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_DUST_SPOTS)
    .map(({ x, y, r }) => ({ x, y, r }));
}
