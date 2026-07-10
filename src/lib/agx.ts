/**
 * AgX tone-mapper matrices — a faithful port of RapidRAW's matrix construction
 * (github.com/CyberTimon/RapidRAW, src-tauri/src/image_processing.rs,
 * `calculate_agx_matrices_glam`), which itself follows the standard "community
 * AgX" inset/outset construction used across its many ports (Blender, Godot,
 * Unreal, etc.): the working (sRGB) primaries are inset toward a rotated,
 * scaled-down set of Rec.2020 primaries before the log2/sigmoid tone curve
 * (so the curve operates in a deliberately narrower, desaturated gamut, which
 * is what keeps extremely saturated colours from posterising as they roll off
 * to white), then "outset" back out afterwards.
 *
 * These two matrices are fixed constants — they don't depend on any user
 * parameter — so they're computed once at module load and exported as
 * ready-to-upload Float32Arrays.
 */

type Vec2 = [number, number];
type Vec3 = [number, number, number];
// Row-major 3x3: m[row*3 + col].
type Mat3 = [number, number, number, number, number, number, number, number, number];

function mul(a: Mat3, b: Mat3): Mat3 {
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[k * 3 + j];
      r[i * 3 + j] = s;
    }
  return r;
}

function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Standard adjugate/determinant 3x3 inverse. */
function invert(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const D = c * h - b * i;
  const E = a * i - c * g;
  const F = b * g - a * h;
  const G = b * f - c * e;
  const H = c * d - a * f;
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  const invDet = 1 / det;
  return [A * invDet, D * invDet, G * invDet, B * invDet, E * invDet, H * invDet, C * invDet, F * invDet, I * invDet];
}

/** Mirrors glam's `Mat3::from_cols` — each argument becomes a matrix COLUMN. */
function fromCols(c0: Vec3, c1: Vec3, c2: Vec3): Mat3 {
  return [c0[0], c1[0], c2[0], c0[1], c1[1], c2[1], c0[2], c1[2], c2[2]];
}

function xyToXyz([x, y]: Vec2): Vec3 {
  if (y < 1e-6) return [0, 0, 0];
  return [x / y, 1, (1 - x - y) / y];
}

function primariesToXyzMatrix(primaries: [Vec2, Vec2, Vec2], whitePoint: Vec2): Mat3 {
  const rXyz = xyToXyz(primaries[0]);
  const gXyz = xyToXyz(primaries[1]);
  const bXyz = xyToXyz(primaries[2]);
  const primariesMatrix = fromCols(rXyz, gXyz, bXyz);
  const whiteXyz = xyToXyz(whitePoint);
  const s = apply(invert(primariesMatrix), whiteXyz);
  return fromCols(
    [rXyz[0] * s[0], rXyz[1] * s[0], rXyz[2] * s[0]],
    [gXyz[0] * s[1], gXyz[1] * s[1], gXyz[2] * s[1]],
    [bXyz[0] * s[2], bXyz[1] * s[2], bXyz[2] * s[2]],
  );
}

function rotateAndScalePrimary(primary: Vec2, whitePoint: Vec2, scale: number, rotation: number): Vec2 {
  const pRel: Vec2 = [primary[0] - whitePoint[0], primary[1] - whitePoint[1]];
  const pScaled: Vec2 = [pRel[0] * scale, pRel[1] * scale];
  const sinR = Math.sin(rotation);
  const cosR = Math.cos(rotation);
  const pRotated: Vec2 = [pScaled[0] * cosR - pScaled[1] * sinR, pScaled[0] * sinR + pScaled[1] * cosR];
  return [whitePoint[0] + pRotated[0], whitePoint[1] + pRotated[1]];
}

const WP_D65: Vec2 = [0.3127, 0.329];
const PRIMARIES_SRGB: [Vec2, Vec2, Vec2] = [
  [0.64, 0.33],
  [0.3, 0.6],
  [0.15, 0.06],
];
const PRIMARIES_REC2020: [Vec2, Vec2, Vec2] = [
  [0.708, 0.292],
  [0.17, 0.797],
  [0.131, 0.046],
];

function computeAgxMatrices(): { pipeToRendering: Mat3; renderingToPipe: Mat3 } {
  const pipeWorkProfileToXyz = primariesToXyzMatrix(PRIMARIES_SRGB, WP_D65);
  const baseProfileToXyz = primariesToXyzMatrix(PRIMARIES_REC2020, WP_D65);
  const xyzToBaseProfile = invert(baseProfileToXyz);
  const pipeToBase = mul(xyzToBaseProfile, pipeWorkProfileToXyz);

  // Community-AgX constants: how far each Rec.2020 primary is inset/rotated
  // toward D65 white before tone-mapping (and un-inset/un-rotated after).
  const inset = [0.2946245, 0.25861925, 0.14641371];
  const rotation = [0.03540329, -0.02108586, -0.06305724];
  const outset = [0.2907764, 0.2631554, 0.04581072];
  const unrotation = rotation;
  const masterOutsetRatio = 1.0;
  const masterUnrotationRatio = 0.0;

  const insetAndRotated = PRIMARIES_REC2020.map((p, idx) =>
    rotateAndScalePrimary(p, WP_D65, 1 - inset[idx], rotation[idx]),
  ) as [Vec2, Vec2, Vec2];
  const renderingToXyz = primariesToXyzMatrix(insetAndRotated, WP_D65);
  const baseToRendering = mul(xyzToBaseProfile, renderingToXyz);

  const outsetAndUnrotated = PRIMARIES_REC2020.map((p, idx) =>
    rotateAndScalePrimary(p, WP_D65, 1 - masterOutsetRatio * outset[idx], masterUnrotationRatio * unrotation[idx]),
  ) as [Vec2, Vec2, Vec2];
  const outsetToXyz = primariesToXyzMatrix(outsetAndUnrotated, WP_D65);
  const tempMatrix = mul(xyzToBaseProfile, outsetToXyz);
  const renderingToBase = invert(tempMatrix);

  const pipeToRendering = mul(baseToRendering, pipeToBase);
  const renderingToPipe = mul(invert(pipeToBase), renderingToBase);

  return { pipeToRendering, renderingToPipe };
}

function toColumnMajorFloat32(m: Mat3): Float32Array {
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
}

const { pipeToRendering, renderingToPipe } = computeAgxMatrices();

/** Column-major, ready for `uniformMatrix3fv`. */
export const AGX_PIPE_TO_RENDERING_MATRIX = toColumnMajorFloat32(pipeToRendering);
export const AGX_RENDERING_TO_PIPE_MATRIX = toColumnMajorFloat32(renderingToPipe);
