function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Blackbody colour at a given temperature as an sRGB triplet in [0,1], using
 * Tanner Helland's curve-fit of the Planckian locus (accurate to a few ΔE over
 * 1000–40000K). This is what makes the Temperature slider track real Kelvin
 * illuminants — candlelight, tungsten, daylight, overcast sky — instead of an
 * ad-hoc opposing R/B gain.
 */
function kelvinToSrgb(kelvin: number): [number, number, number] {
  const k = clamp(kelvin, 1000, 40000) / 100;
  const r = k <= 66 ? 255 : 329.698727446 * Math.pow(k - 60, -0.1332047592);
  const g =
    k <= 66
      ? 99.4708025861 * Math.log(k) - 161.1195681661
      : 288.1221695283 * Math.pow(k - 60, -0.0755148492);
  const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255];
}

/**
 * Linear-light RGB gains for the shader's white-balance stage.
 *
 * The temperature slider moves along the Planckian locus in MIREDs
 * (1e6/Kelvin) — the spacing photographers' correction filters use, because
 * equal mired steps are perceptually even, unlike raw Kelvin where a 500K step
 * is huge at 3000K and invisible at 9000K. Slider 0 sits at D65 (6500K);
 * +100 warms to ~3900K (tungsten territory), -100 cools to ~18600K (deep
 * shade/blue sky). The image is multiplied by the ratio of the target
 * blackbody colour to neutral D65, normalised to luma 1 so changing
 * temperature never changes overall brightness. Tint stays a green–magenta
 * gain on G, the axis perpendicular to the locus.
 */
export function computeWbGains(temperature: number, tint: number): [number, number, number] {
  const MIRED_D65 = 1e6 / 6500;
  const kelvin = 1e6 / (MIRED_D65 + temperature);

  const target = kelvinToSrgb(kelvin).map(srgbToLinear);
  const neutral = kelvinToSrgb(6500).map(srgbToLinear);

  let r = target[0] / neutral[0];
  let g = target[1] / neutral[1];
  let b = target[2] / neutral[2];

  g *= Math.pow(1 + tint * 0.003, 2.2);

  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / l, g / l, b / l];
}
