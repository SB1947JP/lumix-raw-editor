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

vec3 applyToneRegions(vec3 c, float highlights, float shadows, float whites, float blacks) {
  float l = luma(c);
  float highlightMask = smoothstep(0.35, 1.0, l);
  float shadowMask = 1.0 - smoothstep(0.0, 0.65, l);
  float whiteMask = smoothstep(0.6, 1.0, l);
  float blackMask = 1.0 - smoothstep(0.0, 0.4, l);

  c += vec3((highlights / 100.0) * highlightMask * -0.35);
  c += vec3((shadows / 100.0) * shadowMask * 0.35);
  c += vec3((whites / 100.0) * whiteMask * 0.5);
  c += vec3((blacks / 100.0) * blackMask * -0.5);
  return c;
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
    // doesn't introduce colored fringing/halos along edges.
    float detail = luma(color) - luma(blur);
    color += detail * (uSharpen / 100.0) * 2.0;
  }

  color *= pow(2.0, uExposure);
  color = softClipHighlights(color, 0.65, 0.35);
  color = applyWhiteBalance(color, uTemperature, uTint);

  // Brightness lifts/lowers midtones via a gamma curve (0 and 1 stay fixed),
  // unlike Exposure's uniform multiplicative gain which pushes highlights
  // toward clipping much faster.
  float brightnessGamma = pow(2.0, -uBrightness / 100.0);
  color = pow(clamp(color, 0.0, 1.0), vec3(brightnessGamma));

  float contrastFactor = tan((clamp(uContrast, -99.0, 99.0) / 100.0 + 1.0) * 0.78539816);
  color = (color - 0.5) * contrastFactor + 0.5;

  color = applyToneRegions(color, uHighlights, uShadows, uWhites, uBlacks);
  color = applySaturationVibrance(color, uSaturation, uVibrance);

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
