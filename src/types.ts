export interface DecodedImage {
  /** Interleaved RGB pixel data, one byte or uint16 per channel per libraw outputBps */
  data: Uint8Array | Uint16Array;
  width: number;
  height: number;
  bitsPerSample: 8 | 16;
}

/** A geotag decoded from the file's EXIF, in the signed decimal degrees that
 *  every mapping service speaks (north/east positive, south/west negative). */
export interface GpsCoords {
  latitude: number;
  longitude: number;
  /** Metres relative to sea level; negative when the EXIF altitude ref says "below". */
  altitude?: number;
}

export interface RawMetadata {
  make?: string;
  model?: string;
  iso?: number;
  shutter?: number;
  aperture?: number;
  focalLength?: number;
  timestamp?: number;
  colors?: number;
  /** Present only when the camera actually recorded a valid geotag. */
  gps?: GpsCoords;
}

export interface DecodedRaw {
  preview: DecodedImage;
  full: DecodedImage;
  metadata: RawMetadata;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A control point on the luma tone curve; both axes in [0,1] (display/tonal). */
export interface CurvePoint {
  x: number;
  y: number;
}

/** A sensor-dust spot to heal over, in normalized source-image coordinates so
 *  it survives the half-res preview → full-res export jump unchanged. `r` is
 *  measured along x (i.e. as a fraction of image *width*) for both axes: the
 *  spot is round in pixels, not in the non-square uv space. */
export interface DustSpot {
  x: number;
  y: number;
  r: number;
}

export type TonemapMode = 'classic' | 'agx';

export interface EditParams {
  tonemapMode: TonemapMode;
  exposure: number; // stops, -5..5
  brightness: number; // -100..100
  contrast: number; // -100..100
  highlights: number; // -100..100
  shadows: number; // -100..100
  whites: number; // -100..100
  blacks: number; // -100..100
  temperature: number; // -100..100 (relative shift from as-shot)
  tint: number; // -100..100
  saturation: number; // -100..100
  vibrance: number; // -100..100
  sharpen: number; // 0..100
  /** Luma tone curve control points (both axes 0..1). Default is the identity line. */
  lumaCurve: CurvePoint[];
  rotation: number; // degrees, 0/90/180/270 plus fine rotation -45..45
  crop: CropRect | null;
  /** Spots healed over by the Dust Removal button. Empty by default — nothing
   *  is ever retouched unless the user asks for it. */
  dustSpots: DustSpot[];
}

export const DEFAULT_EDIT_PARAMS: EditParams = {
  tonemapMode: 'agx',
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  sharpen: 0,
  lumaCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  rotation: 0,
  crop: null,
  dustSpots: [],
};
