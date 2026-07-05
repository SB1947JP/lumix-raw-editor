import { CropRect } from '../types';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Largest axis-aligned rectangle that fits entirely within a w×h frame after
 * it's been rotated by `rotationDegrees` about its center — i.e. the crop
 * that excludes every pixel the rotation would otherwise sample from outside
 * the source image (which get smeared via edge-clamping). Standard
 * "largest inscribed rectangle in a rotated rectangle" construction.
 */
export function computeAutoCropForRotation(imageWidth: number, imageHeight: number, rotationDegrees: number): CropRect {
  const angle = (Math.abs(rotationDegrees) * Math.PI) / 180;
  if (angle < 1e-6 || imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const w = imageWidth;
  const h = imageHeight;
  const widthIsLonger = w >= h;
  const sideLong = widthIsLonger ? w : h;
  const sideShort = widthIsLonger ? h : w;

  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  let wr: number;
  let hr: number;
  if (sideShort <= 2 * sinA * cosA * sideLong || Math.abs(sinA - cosA) < 1e-10) {
    // "Half constrained" case: two crop corners touch the long side, the
    // other two sit on the midline parallel to it.
    const x = 0.5 * sideShort;
    if (widthIsLonger) {
      wr = x / sinA;
      hr = x / cosA;
    } else {
      wr = x / cosA;
      hr = x / sinA;
    }
  } else {
    // "Fully constrained" case: the crop touches all four sides.
    const cos2A = cosA * cosA - sinA * sinA;
    wr = (w * cosA - h * sinA) / cos2A;
    hr = (h * cosA - w * sinA) / cos2A;
  }

  const cropWidth = clamp(wr / w, 0.05, 1);
  const cropHeight = clamp(hr / h, 0.05, 1);
  return {
    x: (1 - cropWidth) / 2,
    y: (1 - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

/** Intersection of two crop rects (both fractions of the same frame). */
export function intersectCropRects(a: CropRect, b: CropRect): CropRect {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  return {
    x: x0,
    y: y0,
    width: Math.max(0.01, x1 - x0),
    height: Math.max(0.01, y1 - y0),
  };
}

export function isFullFrame(crop: CropRect): boolean {
  return crop.width >= 0.999 && crop.height >= 0.999;
}
