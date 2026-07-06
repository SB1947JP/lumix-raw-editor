#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uImage;
uniform vec2 uTexelSize;

uniform float uExposure;    // stops
uniform float uBrightness;  // -100..100
uniform float uContrast;    // -100..100
uniform float uHighlights;  // -100..100
uniform float uShadows;     // -100..100
uniform float uWhites;      // -100..100
uniform float uBlacks;      // -100..100
uniform float uTemperature; // -100..100
uniform float uTint;        // -100..100
uniform float uSaturation;  // -100..100
uniform float uVibrance;    // -100..100
uniform float uSharpen;     // 0..100

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// The decoded image is already sRGB gamma-encoded. Exposure stops are a
// linear-light concept (each stop is a literal doubling of light captured),
// so applying `2^ev` directly to the gamma-encoded values is much more
// aggressive than a real stop — gamma encoding compresses highlights, and
// multiplying already-compressed values compounds that compression the
// wrong way, blowing out highlights far faster than expected. Converting to
// linear light, applying the stop there, and converting back gives the
// gentler, camera-like highlight rolloff a gamma curve naturally provides.
float srgbToLinear(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
vec3 srgbToLinear(vec3 c) {
  return vec3(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
}
float linearToSrgb(float c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
vec3 linearToSrgb(vec3 c) {
  return vec3(linearToSrgb(c.r), linearToSrgb(c.g), linearToSrgb(c.b));
}

// Compresses values above `knee` so they approach 1.0 asymptotically instead
// of overshooting it and getting hard-clipped later — even a very large
// excess still lands just under 1.0, preserving some separation between
// bright tones instead of flattening them all to solid white.
vec3 softClipHighlights(vec3 c, float knee, float range) {
  vec3 excess = max(c - knee, 0.0);
  return c - excess + (1.0 - knee) * excess / (excess + range);
}

vec3 applyWhiteBalance(vec3 c, float temp, float tint) {
  vec3 gain = vec3(
    1.0 + temp * 0.004,
    1.0 + tint * 0.003,
    1.0 - temp * 0.004
  );
  return c * gain;
}

// Retargets a pixel's luma to `lTarget` (both values perceptual/gamma-encoded)
// while leaving its hue and saturation untouched. This must be done as a
// multiplicative scale of the *linear-light* RGB triplet — scaling every
// channel by the same factor is the one operation that's guaranteed not to
// shift color, because it corresponds to physically changing the amount of
// light without altering its spectral ratios. Doing the equivalent adjustment
// as a flat additive shift on gamma-encoded channels (the old approach) is
// not hue-preserving: gamma compresses channels unevenly, so an equal delta
// added to R/G/B changes their ratios, and is exactly what produced the
// mushy, discolored highlights/shadows.
vec3 scaleToLuma(vec3 c, float l, float lTarget) {
  vec3 linC = srgbToLinear(max(c, 0.0));
  float linL = max(luma(linC), 1e-4);
  float linTarget = srgbToLinear(clamp(lTarget, 0.0, 1.0));
  return linearToSrgb(linC * (linTarget / linL));
}

// Highlights: negative values recover detail by compressing the bright range
// toward a pivot (pulling near-white pixels down more than moderately bright
// ones, which is what actually reveals lost gradation instead of just
// dimming everything by a flat amount); positive values expand/brighten the
// same range.
vec3 applyHighlights(vec3 c, float highlights) {
  float l = luma(c);
  float pivot = 0.5;
  float amt = clamp(highlights / 100.0, -1.0, 1.0);
  float factor = 1.0 + amt * 0.6; // <1 compresses (recover), >1 expands (brighten)
  float mask = smoothstep(0.3, 0.7, l);

  float lTarget = mix(l, pivot + (l - pivot) * factor, mask);
  return scaleToLuma(c, l, lTarget);
}

vec3 applyToneRegions(vec3 c, float shadows, float whites, float blacks) {
  float l = luma(c);
  float shadowMask = 1.0 - smoothstep(0.0, 0.65, l);
  float whiteMask = smoothstep(0.6, 1.0, l);
  float blackMask = 1.0 - smoothstep(0.0, 0.4, l);

  float lTarget = l
    + (shadows / 100.0) * shadowMask * 0.35
    + (whites / 100.0) * whiteMask * 0.5
    + (blacks / 100.0) * blackMask * 0.5;
  return scaleToLuma(c, l, lTarget);
}

// Contrast as a symmetric power curve pivoted at mid-gray: distance from 0.5
// is raised to a power, so it's naturally bounded (endpoints always map to
// exactly 0 and 1, never overshoot) and smooth everywhere — unlike a
// tan()-based pivot scale, whose slope runs away to near-vertical as the
// slider approaches its extremes, which is what made high Contrast values
// look like a harsh clip instead of a gradual tonal stretch.
vec3 applyContrast(vec3 c, float contrast) {
  float amt = clamp(contrast, -100.0, 100.0) / 100.0;
  float curveGamma = pow(2.0, -amt * 1.3); // <1 steepens (more contrast), >1 flattens (less)
  vec3 centered = c - 0.5;
  vec3 shaped = sign(centered) * pow(abs(centered) * 2.0, vec3(curveGamma)) * 0.5;
  return shaped + 0.5;
}

vec3 applySaturationVibrance(vec3 c, float saturation, float vibrance) {
  float l = luma(c);
  vec3 grey = vec3(l);
  float satFactor = 1.0 + saturation / 100.0;
  c = mix(grey, c, satFactor);

  float maxChannel = max(c.r, max(c.g, c.b));
  float minChannel = min(c.r, min(c.g, c.b));
  float currentSat = maxChannel - minChannel;
  float vibFactor = 1.0 + (vibrance / 100.0) * (1.0 - currentSat);
  c = mix(vec3(luma(c)), c, vibFactor);
  return c;
}

void main() {
  vec3 color = texture(uImage, vTexCoord).rgb;

  if (uSharpen > 0.0) {
    vec3 n  = texture(uImage, vTexCoord + vec2(0.0, -uTexelSize.y)).rgb;
    vec3 s  = texture(uImage, vTexCoord + vec2(0.0,  uTexelSize.y)).rgb;
    vec3 e  = texture(uImage, vTexCoord + vec2( uTexelSize.x, 0.0)).rgb;
    vec3 w  = texture(uImage, vTexCoord + vec2(-uTexelSize.x, 0.0)).rgb;
    vec3 ne = texture(uImage, vTexCoord + vec2( uTexelSize.x, -uTexelSize.y)).rgb;
    vec3 nw = texture(uImage, vTexCoord + vec2(-uTexelSize.x, -uTexelSize.y)).rgb;
    vec3 se = texture(uImage, vTexCoord + vec2( uTexelSize.x,  uTexelSize.y)).rgb;
    vec3 sw = texture(uImage, vTexCoord + vec2(-uTexelSize.x,  uTexelSize.y)).rgb;

    // 3x3 Gaussian-like blur (center 4, edges 2, corners 1, /16) instead of a
    // plain 4-tap box average, for a more accurate detail estimate.
    vec3 blur = (color * 4.0 + (n + s + e + w) * 2.0 + (ne + nw + se + sw)) / 16.0;

    // Boost luma detail only (not each channel independently) so sharpening
    // doesn't introduce colored fringing/halos along edges. A small noise
    // gate (subtract-and-clamp the threshold, matching darktable's sharpen
    // module) zeroes out tiny sensor-noise fluctuations in flat areas while
    // leaving real edges — which have much larger deltas — essentially
    // untouched, so raising Sharpen doesn't also amplify grain.
    float detail = luma(color) - luma(blur);
    float noiseThreshold = 0.006;
    float shapedDetail = sign(detail) * max(abs(detail) - noiseThreshold, 0.0);
    color += shapedDetail * (uSharpen / 100.0) * 4.0;
  }

  // Clamp to non-negative before the sRGB->linear round trip: pow() with a
  // negative base is undefined in GLSL, and sharpening above can push a
  // handful of dark, noisy pixels slightly below 0.
  vec3 linearColor = srgbToLinear(max(color, 0.0));
  linearColor *= pow(2.0, uExposure);
  color = linearToSrgb(linearColor);

  // Highlight protection only engages once exposure is actually pushed up —
  // at 0 (or negative) exposure the decoded RAW passes through unaltered, so
  // the default/imported view stays faithful to the camera's own rendering.
  float exposureAmount = clamp(uExposure / 3.0, 0.0, 1.0);
  float knee = mix(1.0, 0.55, exposureAmount);
  // `range` is derived (not a free constant) so the curve's slope at the
  // knee matches the identity line's slope of 1 exactly — the standard
  // requirement for a tone curve's shoulder to blend in without a visible
  // "elbow", the same property a spline-based curve (e.g. darktable's tone
  // curve module) enforces by construction.
  float range = max(1.0 - knee, 0.02);
  color = softClipHighlights(color, knee, range);
  color = applyWhiteBalance(color, uTemperature, uTint);

  // Brightness lifts/lowers midtones via a gamma curve (0 and 1 stay fixed),
  // unlike Exposure's uniform multiplicative gain which pushes highlights
  // toward clipping much faster.
  float brightnessGamma = pow(2.0, -uBrightness / 100.0);
  color = pow(clamp(color, 0.0, 1.0), vec3(brightnessGamma));

  color = applyContrast(color, uContrast);

  color = applyHighlights(color, uHighlights);
  color = applyToneRegions(color, uShadows, uWhites, uBlacks);
  color = applySaturationVibrance(color, uSaturation, uVibrance);

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
