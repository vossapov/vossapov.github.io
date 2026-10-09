# Parallel portfolio (`/next/`)

All redesign code and new material live under `next/`. The original site remains unchanged. The redesign is published at `/next/`; the original root site remains available.

## Run
Serve the repository root with `python3 next/tools/serve-preview.py --port 8765`. This loopback-only standard-library server supports HTTP Range, required for MP4 seeking; plain `python -m http.server` does not.
Open `http://127.0.0.1:8765/next/?lang=ua`.
No build step or runtime dependency is required; links and assets are root-absolute.

## Current design
- The original spatial timeline is the reference: central descending month axis, employer bands on both sides, concurrent project lanes and duration-proportional card heights. The rejected end-year card feed is not the default.
- Standard/compact time scale, year navigation, search, employer/category filters, gallery, EN/UA, shareable URL state and project dialogs. Narrow screens use readable employer stacks and duration tracks rather than compressed desktop lanes.
- Full cases now live at `/next/case.html?id=<id>&lang=ua`. Generated raster scenes are the primary project covers and case heroes. Original narratives, section artwork and full-size source screens remain available; generated scenes are never double-framed. The full-size viewer supports keyboard navigation and zoom.
- Character and dog use the original artwork animated with Wan 2.2. Video stops offscreen and respects reduced motion; there is no visible playback button.
- The AI-work section is explicitly a draft. Its EN/UA text is editable in `ai-content.js`; it does not claim invented clients, metrics or shipped AI results.
- Local Fixel Text 400/500/600; official MacPaw SIL OFL and authors notices in `assets/fonts/`.

## Curated recent Tatem Blast work
`blastjam` is the existing **Tatem Blast: Color Pop** case, not a new duplicate project.
`content/recent-work.json` adds only five selected September–October 2026 screens in two sections:
1. Shooter Skin, Backgrounds and Welcome Pack: visual design and handoff.
2. Fortune Wheel and Last Chance: explicitly labelled UX wireframes.

Assets are in `assets/recent/blastjam/`. Four are exact PNG bytes recovered from paired historical Figma screenshot responses; Welcome Pack is the exact supplied final reference. No screen content or alpha was reconstructed. `overview.png` is a browser-rendered composition of the real screens in CSS phone shells. The source project and Figma files were not modified. Descriptions exist in both languages; no impact metrics were invented.

## Data and regeneration
Real Tatem gameplay is merged through `content/gameplay-recordings.json`. Both existing cases (`blastjam`, `tilesort`) include an 80-second silent, native-speed recording from the authorized Galaxy A51, installed through Google Play. No simulated gameplay. Idle gaps/interstitials are removed and bottom banner ads cropped out; originals and reproducible edit script are retained in `/home/vossapov/Work/tatem-demo/phone/`. Public MP4/poster/VTT files and SHA-256/edit provenance live in `assets/projects/<id>/videos/`.

Run `python next/tests/gameplay-video.py` with Playwright to verify both media files plus UA/EN at390/1440: actual playback,40s seek, caption URL,206 Range and overflow. Verified interpreter: `/home/vossapov/workspace/output/lacetti-media-review/.venv/bin/python`.

```sh
node next/tools/export-data.cjs
node next/tools/export-presentation.cjs
node next/tools/export-data.cjs --check
node next/tools/export-presentation.cjs --check
```
The first exporter reads inspected `timeline.js` with inert browser stubs, preserving open-ended date flags before serialization. The second reads `present.js`, image dimensions and per-case presentation choices. Both merge the explicitly separate recent-work additions without editing the original sources. Source dates are not silently changed to today's date.

## Current acceptance tests
Use Python with Playwright and Chromium; the verified interpreter here is `/tmp/portfolio-qa-venv/bin/python`. Browser path overrides are available as `CHROME` in the broader suites.
```sh
python next/tests/spatial.py
python next/tests/cases.py
python next/tests/experience.py http://127.0.0.1:8765 --integrated
python next/tests/revision_acceptance.py
node next/tests/recent.cjs
python next/tests/recent.py
```
`qa.py` and `qa_refine.py` belong to the rejected card-feed iteration; their hidden career/year-rail selectors and overview-density expectations are not the current acceptance contract. Current behavior is covered by the suites above. See `QA.md` for actual results and boundaries.

## Personal application cases
`content/additional-projects.json` contains four independent projects in the far-right **Personal projects / Власні проєкти** track (`personal`), separate from Freelance: `diaapp`, `diamirror` and `fluger-kids` in July–August 2026; `lacetti-link` in September 2026. Existing dates are preserved; DiaApp uses the same child-glucose portfolio period. Total: 41 projects, 8 company/independent tracks. Each has EN/UA copy and a separate case.

The desktop timeline retains shared dates and duration heights. Column widths are shared across both sides; the axis moves left to accommodate the additional right-hand track. All tracks fit at 1440px; smaller desktop canvases can scroll horizontally inside the timeline (minimum slot 128px), without overflowing the page. Narrow slots prioritise full project names over thumbnails. Mobile keeps employer stacks. The personal band ends at July 2026 rather than extending into earlier career history.

- DiaApp: original child-glucose artwork in tablet mockups, with the history graph reconstructed from `KidGlucoseView.kt`. Both normal and low states contain synthetic four-hour history; the low curve turns red. Explicitly presentation reconstructions, not native runtime captures. Separate from DiaMirror. Regenerate with `python next/tools/capture-diaapp.py SOURCE_DIAAPP`, then `capture-case-covers.py diaapp` and both exporters. Pixel regression: `python3 next/tests/diaapp-graph.py`.

- DiaMirror: existing UI captured with synthetic demo values; sensor ID scrubbed in the capture DOM. No personal medical history.
- Fluger Kids: explicitly unofficial, separate case for the child radar module. Presentation reconstruction from original scenes, existing web radar prototype and native layout proportions, NOT native runtime screenshots or live alerts.
- Lacetti Link: three Codex-generated cabin mockups with actual native screenshots perspective-composited into the displays; ten byte-exact native demo captures remain in the gallery. Board hero/sections avoid double framing; phone detail mockups stack vertically. Source videos are not embedded in this update. Provenance and Claude visual approval: `assets/projects/lacetti-link/mockups/`. Asset contract: `python3 next/tests/lacetti-mockups.py`.

Images/provenance: `assets/projects/<id>/`. New closed periods use one-based months and `endInclusive:true`. The renderer adds one month only for geometry; visible dates remain July-August or September. The snapshot horizon extends to October's boundary to include completed September; only ongoing ranges follow it. Closed legacy dates remain unchanged. Apps has a separate filter. New cases omit both nonexistent legacy-case links.

Capture helpers (no source-app edits or device/production access):
```sh
python next/tools/capture-personal-projects.py /absolute/path/to/DiaApp
python next/tools/capture-case-covers.py
node next/tools/export-data.cjs
node next/tools/export-presentation.cjs
```
The first uses an allowlisted virtual origin and blocks external requests. The second captures the portfolio's existing CSS mockups. Additional acceptance:
```sh
node next/tests/personal-projects.cjs
python next/tests/personal-layout.py
node next/tests/additional-projects.cjs
python next/tests/additional-projects.py
python next/tests/additional-a11y.py
```
Set `AXE_JS` to a local axe-core bundle if its documented default is unavailable.

### DiaMirror branding and safe-area capture
`assets/projects/diamirror/logo-mark.png` is the unchanged generated transparent logo; its provenance sits alongside it. `content/diamirror-capture.css` is a portfolio-only adaptation, with explicit top/bottom insets (headless desktop `env(safe-area-inset-*)` is zero). It omits technical setup controls, not measurement states. The source app is not modified.

To update only this case, use `capture-personal-projects.py SOURCE_DIAAPP --only-diamirror`, then `capture-case-covers.py diamirror`. The pixel test is `python3 next/tests/diamirror-brand.py` (requires Pillow).

### Fluger video
`assets/projects/fluger-kids/radar-demo.mp4` is an18-second, silent, synthetic prototype recording, embedded in the Danger section with red poster and UA/EN caption tracks. It uses original scene/threat art, not live alert data or a native-app runtime capture.

Regenerate with the QA Playwright Python: `python next/tools/render-fluger-demo.py /absolute/path/to/DiaApp`, then `python next/tools/capture-case-covers.py fluger-kids` and both normal exporters. Verify via `python3 next/tests/fluger-video.py`, `python next/tests/fluger-playback.py`, and `python3 next/tests/preview-range.py`. The renderer requires ffmpeg; the artifact test requires ffprobe. Use the Range-capable server above for playback/seek tests.

## Boundaries
Chromium tested; Firefox and real Safari/iOS have not been tested. Static Figma wireframes are not implemented game features. AI text needs the owner's factual refinement. This is a local parallel version with `noindex, follow`; deployment requires a separate request.

## Generated portfolio mockups

`assets/generated-mockups/<project-id>.png` contains finished scenes generated by the built-in ImageGen tool, using the project's existing artwork as reference. These are complete generated images, not CSS shells or programmatically pasted screens. Each adjacent JSON file preserves the final prompt and source reference. The scope is 40 illustrated projects; `room8p` remains without artwork because no shareable NDA screens exist.

Both exporters discover these files. The data exporter uses them for timeline/gallery/dialog previews, while preserving previous covers in `sourceArtwork`. The presentation exporter uses each generated image as a board hero, includes its dimensions and bilingual caption, and retains all originals and videos. Generated fine text and details are illustrative; original images remain the authority for precise interface inspection. To refresh after adding or replacing an asset, run both exporters in the documented order. Native generated files are retained without post-generation compositing.


### Hero video avatar (2026-10-10)

The active hero is now a native Wan 2.2 image-to-video animation of the original man-and-dog artwork, generated through the free Hugging Face ZeroGPU demo after explicit upload consent. This supersedes both the PNG parallax and the rejected procedural 3D figurine. Neither old avatar module is loaded by the homepage. No paid credits, subscription or API were used.

The untouched 4.0625-second source and 8-second forward/reverse loop are retained in `assets/hero-video/`. Output is H.264, 560×832 at 16 fps; loop 726,800 bytes. Prompt, seed, source, service and hashes are in `content/avatar-animation-plan.json`. Native source detail is retained; there is no face redraw in the site code.

`hero-video.js` pauses offscreen and in hidden tabs, preserves manual pause, and respects reduced motion with explicit play available. The static poster is visible before playback or on video failure. Controls follow UA/EN. `node next/tests/hero-video.cjs` covers motion preferences and playback state. Browser QA confirmed native decode, 8-second looping playback, pause/resume and no horizontal overflow at desktop and 390 px. Local preview only; not published.
