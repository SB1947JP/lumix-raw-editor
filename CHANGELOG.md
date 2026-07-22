# Changelog

A running history of the important steps taken to build Sean's RAW Editor.

## Foundation

- Built a client-side RAW/DNG editor (Vite + React + TypeScript + Tailwind), decoding RW2/DNG via LibRaw-WASM in a Web Worker, editing via a WebGL2 fragment shader pipeline
- Set up GitHub repo + GitHub Actions deploy to GitHub Pages, live at sb1947jp.github.io/seans-raw-editor

## Core editing bugs fixed

- Portrait double-rotation bug (LibRaw already uprights images; our shader was rotating again)
- Crop aspect-ratio distortion, zoom-not-centering (including a recurring portrait/50%-zoom edge case), zoom-in losing scroll anchor
- Highlights/Blacks sliders had inverted direction
- Rotation corner "smudging" — added auto-crop to the largest rectangle that avoids sampling outside the frame, later fixed to preserve a *locked* aspect ratio while rotating instead of drifting

## Color/tone algorithm overhauls (the deepest recurring work)

- Exposure moved from gamma-space to linear-light multiply (was blowing out highlights too fast)
- Contrast rewritten from a runaway `tan()` curve to a bounded symmetric power curve
- Highlights/Shadows/Whites/Blacks rewritten to scale hue-preserving via linear-light luma ratio (was desaturating via flat additive shifts)
- Highlight rolloff rewritten as a knee-gated log-logistic "shoulder" (darktable sigmoid-style), applied as an RGB ratio on the brightest channel so colors never wash to grey — tuned to be inert at rest (true whites reach 255) and only engage as exposure is pushed
- Fixed the final hard clamp that was twisting hue/collapsing saturation on out-of-gamut colors → replaced with hue-preserving chroma compression to gamut
- White balance rebuilt twice: first moved to linear light, then replaced entirely with a proper **CAT16 chromatic adaptation transform** (LMS cone space, von Kries), matching darktable's color-calibration module — fixed real bugs along the way (temp=0 not being an exact identity, tint over-rotating to clipped colors)
- Tone-region masks rewritten as a non-overlapping partition (Blacks/Shadows/Whites) instead of overlapping ranges that double-lifted pixels
- Added signed-square "soft response" curve to Highlights/Shadows/Whites/Blacks sliders so small moves stay subtle
- Vibrance given skin-tone protection (feathers the boost in the orange hue band)
- Rewrote Auto Levels to solve against the actual current tone pipeline (it had drifted out of sync and was slamming Contrast to 95)

## UI/UX features

- Undo, double-click-to-reset sliders, zoom controls, double-click-to-recentre image + pan/hand tool
- Interactive crop box overlay with aspect-ratio presets, default now locks to "Original" ratio
- Auto Levels button with before/after histogram
- Redesigned histogram to a single toggleable before/after box, later upgraded to per-channel **RGB histogram** with a 0–255 scale
- Japanese-palette color-coded section titles, collapsible sidebar panels
- Responsive/mobile layout pass; fixed iPad/iPhone pull-to-refresh and pinch-zoom fighting the app's own gestures
- Export switched to Web Share API on iOS specifically (was failing silently), gated so desktop browsers keep normal downloads; fixed a "must be handling a user gesture" error
- Renamed app to "Sean's RAW Editor"; trimmed base font size

## Film emulation

- Added a "Film emulation" dropdown (renamed from a generic colour dropdown) simulating late-90s stocks — Kodachrome 64, Kodak Gold 200, Portra 400, Fuji Superia 400, Provia 100F/400X, Ektachrome E100, Ektachrome 320T-in-daylight
- Each preset carries real Kelvin balance point (mired-shifted from D65), brand tint, saturation/vibrance character, and tone-curve contrast
- Added then fully removed a film-grain simulation stage (shader noise + slider) per request

## File browser, keywords and GPS map

- Added a **file browser**: pick a whole folder (`webkitdirectory`), pick individual files, or drag a batch in. Chosen over the File System Access API because that one is Chrome/Edge only, and cross-browser support matters here; the trade-off is that the list is session-only, since `File` objects can't survive a reload
- Thumbnails come from each RAW's **embedded JPEG preview** (LibRaw `thumbnailData()`), not a decode — listing a folder would otherwise take minutes and gigabytes. Probes run strictly one file at a time so a large folder can't hold N wasm heaps at once
- Added **keyword tagging** with filter chips (AND across keywords) and a name search. Stored in IndexedDB keyed by file name so tags outlive the reload that the file list doesn't. The RAW files are never modified
- Moved the session slot and keywords behind one shared IndexedDB handle — a single database name can only be open at one version at a time, so separate `indexedDB.open()` calls would deadlock on upgrade. Bumped v1→v2 in place, preserving existing stored sessions
- Added a **GPS map** for geotagged shots. LibRaw does expose `gps_data`, converted here from DMS to signed decimal degrees, strictly: `gpsparsed` separates "no GPS" from a genuine 0°,0°, and a no-fix `'V'` status, missing hemisphere ref or out-of-range value is rejected rather than guessed
- The map is a hand-written slippy map over OpenStreetMap tiles (Web Mercator maths, drag-to-pan, zoom, recentre) rather than Leaflet, avoiding a dependency plus stylesheet and marker assets needing base-path handling for the Pages subdirectory. Carries the required OSM attribution and sends no referrer
- Started as a separate left-hand panel, then folded into the editing panel as an **Edit / Files tab pair** — two panels flanking the photo was more chrome than the interface could carry, and tabbing them reclaimed the width for the image (fit went 18% → 26% on the same window). Replaced `browserOpen` with `sidebarTab`, and dropped the browser's own collapse rail and panel frame in the process
- Removed the header's "Open file" button, now redundant: the browser's Add folder / Add files (and drag-drop) are the way in, and "Delete file" still returns to the dropzone
- Verified against real geotagged RW2 files: thumbnails extracted, coordinates resolved to the correct location, per-photo GPS and altitude differed correctly, tags survived a reload, filtering and dedupe both confirmed

## Interface colour simplification

- The panel had accumulated **eight competing accent colours** — five colour-coded section titles plus separate hues for the file browser, keyword tags, export and the histogram's "before" tab — and the chrome had started competing with the photograph being edited
- Collapsed to a two-colour system expressed by *role* rather than hue, in `UI_COLORS`: one `accent` for anything active/selected/live, and `danger` reserved for destructive actions. Section titles are now neutral
- Consequence, accepted deliberately: dial needles no longer match their section's colour (an earlier request), since the sections no longer have distinct colours. All needles use the single accent
- Removed the now-pointless `SectionColorContext` and the per-section `color` prop threaded through all five sections
- Histogram keeps its R/G/B channel colours — that's data, not decoration
- Verified by scanning every painted `color`/`border`/`background` in the live DOM for non-neutral values: exactly three remain (accent, danger, and the SRE logo's cream), down from eight

## Verification discipline throughout

Every change checked with `tsc` + production build, then functionally verified in-browser via pixel-level `gl.readPixels()` comparisons (saturation ratios, clipping counts, luma) rather than just visual inspection — and only pushed to `main`/deployed when explicitly requested.
