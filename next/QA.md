# Parallel portfolio acceptance - 2026-10-07

## Tatem physical-device gameplay — 2026-10-09
- Google Play installs on explicitly authorized Galaxy A51 / Android13: Tatem Blast0.1.107, Sort Dash1.1.524. Native ADB screenrecord; completed Blast levels1–2 and Sort levels1–3. Originals retained outside the repo. No purchases or paid/ad reward unlocks; automatic interstitials excluded from final cuts. No unrelated household devices modified.
- Two80s H.264/30fps silent edits: Blast720×1506, Sort720×1480. Native speed; idle gaps removed, bottom banners cropped without removing game controls. Posters, UA/EN VTT and per-file hashes/edit lists included. Both final files fully decoded without errors and visually reviewed; phone/desktop screenshots inspected.
- `gameplay-video.py`:8/8 browser states (2cases×2languages×2widths), real play→40s seek→continued playback, manual controls, captions HTTP200, exact32-byte Range206, no horizontal overflow or page errors. Evidence `/tmp/portfolio-gameplay-qa/`. Both exporters fresh; recent-content Node contract passed. Baseline comparison: only blastjam/tilesort presentation cases differ;413tracked original files unchanged. No full-suite/a11y claim for this increment; no commit, push or deployment.


## Fluger motion demo and short DiaMirror copy
- DiaMirror body copy is now61 UA /67 EN words: native sensor apps as sources, shared web/mobile access for any number of viewers, no screenshot forwarding or dependence on one phone. Removed the redundant contribution list. This describes the owner-specified product purpose, not a tested compatibility list of every sensor brand.
- Fluger now includes a red Danger state in its hero, gallery and overview cover. A real18s H.264 MP4 (936x1680,24fps,432frames) is embedded in a phone mockup, with original scene/threat artwork and prototype radar drawing functions. Added synthetic motion paths, sweep highlights, rings/trails and calm→alert→danger→alert→calm transitions. Explicit simulation badge, no live positions/data. UA/EN VTT tracks and download link included.
- Player starts only on request (`preload=none`, no autoplay), supports inline playback/pause/seek and pauses offscreen or on hidden tabs. No autoplay under reduced motion. Recording tools: `render-fluger-demo.py` + `fluger-motion.js`; provenance is beside the MP4.
- Root-cause fix: the old local SimpleHTTPServer returned200 to byte-range requests, making Chromium's seekable interval0 even with all18s buffered. Replaced only the verified local portfolio preview process with `serve-preview.py`, which returns206/416 and correct range headers. `tests/preview-range.py` checks exact returned bytes, suffix/open bounds and HEAD. Native seeking to13s now shows the actual red frame.
- Final verification: full cases390 passed/0failed (`/tmp/portfolio-motion-cases-final.log`);6 video/language/viewport states with actual decoding, seekable duration,13s seek,6 loaded caption cues and offscreen pause;24 new-case states plus timeline/gallery;6 axe states/0violations; clip ffprobe/frame-hash checks; short-copy and safe-area tests; Node content contracts and exporter freshness.
- Earlier checks exposed one canceled metadata request and a false-positive seek test. Switched to click-to-load video and strengthened seeking assertions; both are resolved. A parallel QA command timed out; final accessibility/full-case tests were rerun successfully. Original414 files remain unchanged. No commit/deploy; Chromium only.

## DiaMirror logo and mockup safe areas
- Created one native image_gen mark: mirrored D forms with a shared curve, emerald green, transparent RGBA PNG, 1254x1254. Raw asset preserved unchanged (verified SHA-256), provenance in `assets/projects/diamirror/logo-provenance.json`. Reviewed on white/dark backgrounds and at small UI sizes.
- Added the mark to all three demo-screen headers and the case heading. Regenerated all three images and the mockup overview.
- Portfolio-only CSS `content/diamirror-capture.css` reserves 54px top / 34px bottom safe area and 24px principal content gutters at 390x844. The technical setup/password form and footer are omitted from the focused dashboard view; source app remains unchanged.
- Desktop capture does not populate `env(safe-area-inset-*)`, which caused the original clipping. No global phone-frame padding was added, so other projects do not receive duplicate insets.
- Pixel regression `python3 next/tests/diamirror-brand.py`: all three screens have clean top/bottom safe regions and visible brand marks. Uses the system Python with Pillow; browser suites use the QA Playwright venv.
- Passed: 24 case/language/width states plus timeline/gallery, 6 axe states with zero violations, additional-project and recent-content contracts, exporter freshness and case JS syntax. Original 414 protected files unchanged. No source-app edits, commit or deployment.

## Three personal cases - previous acceptance
- Added DiaMirror and Fluger Kids to Freelance, July-August 2026; Lacetti Link to Freelance, September 2026. Dates follow the owner's requested placement, not screenshot timestamps.
- **40 cases in EN/UA**, full `tests/cases.py`: **390 passed, zero failed**, final standalone run exited 0. Log: `/tmp/portfolio-three-cases-final.log`.
- New-case matrix: **24 states** (3 projects, 2 languages, 320/390/768/1440px), plus timeline dates/durations, Apps/Freelance filters, gallery, dialog links, image decoding and full-size viewer. No dead legacy-case links in header or footer. Passed after final mockup covers.
- Spatial **63/63**; revision acceptance **9/9**; Blast Jam regression **54/54** plus its Node content test.
- New-case axe: **6 states, zero violations** (each case at 390/1440). Not complete WCAG certification.
- Both snapshots current; JS syntax passes. Final export includes 315 distinct image URLs. Rechecked 414 protected originals: unchanged.
- Eight source/demo views plus three mockup covers. DiaMirror uses synthetic values with its sensor ID scrubbed; Fluger uses explicitly labelled presentation reconstructions, not native screenshots; Lacetti uses existing native demo/test captures. No source-app changes or live-service/device access.
- Capture fixes: explicit datetime avoids seconds/milliseconds mismatch; complete API fixture includes chart `now` and respects history window. Freshness assertions and visual review guard against plausible but blank charts.
- A combined case/recent command timed out after cases passed. Both suites then ran independently to successful completion; timeout was not counted as a pass.
- Evidence: `/tmp/portfolio-three-qa/`, `/tmp/portfolio-three-spatial.log`, `/tmp/portfolio-three-recent-final.log`. No commit/deploy; Chromium only, Safari/iOS and Firefox untested.

## Previous revision (before the three new cases)
The user rejected the card-feed interpretation. The current parallel version restores the original spatial timeline and adds case mockups, character/dog depth interaction, a draft AI section and a curated recent-work update to Tatem Blast: Color Pop.

No commit, deployment or edits to the original site. Base commit: `e43d051`.
SHA-256 readback: all **414 original files** remain byte-identical, including prior user changes to `style.css` and `.hermes.md`.

## Verified execution
- Spatial timeline: **63 checks, zero failures**; duration geometry, concurrency, filters, year navigation, dialogs, languages and responsive layouts. Durable suite: `tests/spatial.py`.
- Hero/AI integrated suite: all assertions passed; native layer alignment, cursor response, touch animation, pause, reduced motion, tab keyboard controls, language changes and mobile layout. Log: `/tmp/portfolio-experience-final.log`.
- Full-case suite before the recent-work overlay: **372 passed, zero failed**. Fixed undersized mobile brand/screenshot targets and initial deep-anchor smooth scrolling.
- After the recent-work overlay: independent readback of **all 37 cases in both languages (74 routes)**, exact source titles, image loading and section presence; **304 distinct case image URLs** returned HTTP 200. Evidence: `/tmp/portfolio-revision-cases/`.
- Recent-work regression: **54 browser checks, zero failed**, at 320/390/768/1440px in both languages, plus `node tests/recent.cjs`. Exactly five selected phone screens, two additions, full-size viewer, swipeable phone strips, explicit wireframe labels, existing-project dialog and mockup preview. Fixed nested feature-grid min-width causing phone overflow.
- Axe: **zero violations across eight tested home/dialog/case states**, rerun after recent content. Not a claim of complete WCAG compliance. Evidence: `/tmp/portfolio-revision-final/axe.json`.
- Both snapshot freshness checks and JavaScript syntax checks passed.
- Desktop/mobile screenshots inspected directly, including the original/revised timeline, assembled character and dog, case mockups, AI draft and all five selected recent screens.

## Recent screen provenance
Shop screens: final 2026-09-24 Figma readbacks of `2916:7927` and `2985:8173`.
Welcome Pack: exact 2026-09-29 final supplied reference.
Fortune Wheel: final 2026-10-07 `2486:5647`; Last Chance: final `2398:7523`.
Expired asset links were not treated as images: paired historical MCP base64 image responses were recovered and decoded without altering image bytes. Local source evidence: `/tmp/portfolio-recent-source/provenance.json`.

## Personal-project column (2026-10-08)
- Final full-case regression: **396 passed, zero failed** (`/tmp/portfolio-personal-cases.log`); revision acceptance9/0.
- Added the fourth visual company track at the far right, `personal` / «Власні проєкти». DiaMirror, Fluger Kids and Lacetti Link moved out of Freelance; DiaApp is a separate fourth entry with its own concept-based tablet case. Total: 41 unique projects and 8 company/independent tracks. Existing dates unchanged; DiaApp placed July–August 2026.
- Shared month alignment and duration heights preserved. Equal column widths across both sides; axis offset follows concurrency counts. At 1440px all four tracks fit; at narrow desktop widths horizontal overflow stays inside the canvas. Cards have a 128px floor and narrow-slot typography (names before thumbnails); mobile uses readable stacks. The personal band stops at July 2026.
- `spatial.py`: 63 checks, zero failures. `personal-layout.py`: 8 UA/EN states at 1100/1440/1920/390px, all four IDs, exact group membership, no overlaps/page overflow, untruncated personal-project names, same-month alignment, stable filter geometry and working dialogs. Fast successive dialog closes also exposed and fixed an existing navigation guard race.
- `additional-projects.py`: 32 case states, 4 projects, timeline/gallery PASS. `additional-a11y.py`: 8 case states, zero axe violations. Data identity, short-copy, recent-work contracts, exporter freshness and JS syntax pass. All 414 protected original files unchanged. Evidence: `/tmp/portfolio-personal-qa/`, `/tmp/portfolio-personal-spatial.log`, `/tmp/portfolio-three-qa/`.
- DiaApp reuses original AI-generated visual concepts, not native screenshots or personal health records; exact sources are recorded beside its assets. No source-app edits, commit, push or deployment.

## DiaApp missing-history correction (2026-10-08)
- Root cause: early generated concept art was used as complete screens, omitting the graph rendered by native `KidGlucoseView.kt`. Both portfolio screens now include the reconstructed white history card, target band and threshold-coloured curve; low history turns red. Original source files untouched.
- `diaapp-graph.py` failed on the old missing card, then passed for both corrected images; verifies visible curves, red low segment and synthetic240-point series ending at6.2/3.4. Cover regenerated. Case text/captions/provenance now state reconstruction rather than unchanged concept capture.
- `additional-projects.py diaapp`:8 UA/EN states at320/390/768/1440, images/viewer/overflow plus timeline/gallery PASS; personal-project identity and both exporter freshness checks pass. Not a new full-suite run.

## DiaApp three-state visual revision (2026-10-08)
- Added the missing yellow/high state (12.1, upward arrow) to the UA/EN case, gallery and tablet presentation. Retained two visual sections: normal, then high/low states.
- Replaced decorative chart waves with quantised gradual excursions, a fixed 0–20 axis, hourly labels, faint grid/range and thin threshold-coloured trace. Removed public demo labels; synthetic/reconstruction provenance remains in asset documentation.
- Moved the low-state 3.4 and trend arrow higher/right via native image_gen edit; original artwork retained, generated edit copied byte-for-byte before chart composition. Inspected high/low final screens.
- Verified `diaapp-graph.py` (three states, amber/red segments, endpoints, rate of change, label removal, raised low reading), `additional-projects.py diaapp` (8 UA/EN viewport states, all three images, viewer/overflow, timeline/gallery), personal identity and both exporter freshness checks. Overview regenerated. Not a full-suite rerun; no commit/deploy.

## Lacetti Link media integration (2026-10-08)
**Videos now fully embedded and visible.**

- **3 native H.264 MP4 videos** (all 1280x720, H.264 codec, copied byte-exact from source):
  - `01-driving-and-music.mp4` (39s, 1.4MB): dashboard & music controls over highway/city driving
  - `02-trip-history.mp4` (27.7s, 1.5MB): month→day→detail trip journal with route & analytics
  - `03-fuel-and-service.mp4` (29s, 1.3MB): LPG/petrol levels, fuel calibration, oil service tracking

- **3 visible video sections** in case presentation (landscape/tablet frame, not phone-only):
  1. "Driving: dashboard and music" with 3 native screenshots (cruising, city, music)
  2. "Trip history: from day to detail" with 4 native screenshots (month, day, detail, charts)
  3. "Fuel and maintenance tracking" with 3 native screenshots (overview, calibration, service)

- **10 native screenshots** (all 1280x720, visible in main sections, not collapsed gallery):
  - Dashboard: 01-cruising, 02-city / Music: 03-music
  - Trips: 04-month, 05-day, 06-detail, 07-charts
  - Fuel: 08-overview, 09-calibration / Service: 10-oil-service

- **Player config** (backward-compat with Fluger, safe for all devices):
  - `videoKind: 'landscape'` renders in 16:9 landscape frame (`dv-land`) on desktop/tablet
  - Falls back to phone frame if omitted (existing Fluger unchanged)
  - Manual controls (users click to play), `playsinline`, `preload=none`, no autoplay
  - Pauses when offscreen (IntersectionObserver) or on hidden tab
  - **Captions**: 6 VTT files (UA + EN for each video), grounded in real clip timelines

- **case.js extension**:
  - New `videoKind` field read from section config
  - Defaults to phone for backward compatibility
  - Video frame selection: `videoKind === 'landscape' ? 'dv-land' : 'dv-phone'`
  - Fluger Kids demo (phone) remains unchanged

- **Hash verification** (13 media total):
  - All 3 videos: SHA-256 match source manifest ✓
  - All 10 native screenshots: SHA-256 match source manifest ✓
  - 3 reviewed mockups: 1536x1024 boards with valid hashes from composite manifest ✓

- **Image decode**: All 10 native 1280x720 PNG decode successfully ✓

- **Tests**:
  - `lacetti-mockups.py`: 3 boards + 10 native + 3 visible videos + all captions ✓
  - `verify-lacetti-media.py`: 6 comprehensive suites (hash, decode, sections, natives, captions, JSON) ✓
  - All 13 media hashes verified against source
  - All 6 VTT caption files present and correct
  - 3 video sections with proper `videoKind`, posters, captions (UA/EN)
  - All 10 native images appear in main case sections (dashboard/music, trips, fuel/oil)

- **Original sources**:
  - Source manifest: `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Lacetti/dist/Lacetti-Portfolio/manifest.json`
  - Source videos: `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Lacetti/dist/Lacetti-Portfolio/videos/`
  - Source screenshots: `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Lacetti/dist/Lacetti-Portfolio/screenshots/`
  - All marked as synthetic demo, not live vehicle or proprietary data

- **No fabrication**: All 3 MP4s and 10 PNG confirmed H.264 video + RGB images. No invented features, calibration curves or live telemetry. Fluger (phone mockup) regression test passes; Lacetti videos render in tablet frame without collision.

- **Evidence**: Verification test output shows all 6 test suites pass. Test scripts in `/next/tests/`. Updated JSON maintains all other 3 projects unchanged (DiaApp, DiaMirror, Fluger Kids).

All 414 protected original files remain byte-identical. No commit/deploy. Chromium only; real Safari/Firefox untested.

## Reproduce and limitations
Serve the repository root. Current test commands are in `README.md`. Old `qa.py` / `qa_refine.py` target the superseded card-feed UI, not this revision.
Chromium only; real Safari/iOS and Firefox untested. Original timeline date ranges retained. Five recent screen examples are a selection, not an archive of all work. Wheel screens are UX wireframes, not a shipped-game claim. AI copy remains explicitly draft. Nothing has been published.

## Parent acceptance: visible Lacetti media (supersedes worker report)
Parent found worker had not regenerated presentation data; video imgs were ignored by renderer and videoKind omitted by exporter. Fixed renderer to show10native screenshots, exported validated landscape kind, restored base dv class, full-width landscape players and single-column mobile screenshot groups. Removed unsupported feature/safety claims.
Actual browser verification:3players +10main-section native images in UA/EN390/1440, all3videos play and seek to10s then advance, no overflow or JS errors. Source3videos full decode and SHA256 pass. Existing Fluger6playback states pass. Axe8states/0violations. Parent visually inspected desktop and mobile captures. Original root baseline unchanged. Full-case exploratory run timed out; no full-suite pass claimed. Evidence: /home/vossapov/workspace/output/lacetti-media-review/parent-verification.json.

## Generated mockups — 2026-10-09

- 40 complete scenes created with built-in ImageGen by the main agent and three agents; native PNG outputs preserved. Each has its source and final prompt in adjacent JSON. Index and SHA-256 values: `assets/generated-mockups/index.json`.
- Both exporters pass `--check`. Structural audit passes for all 41 cases: 40 generated primary previews and board heroes, all original source artwork retained, all referenced files present, NDA `room8p` has no generated imagery.
- In-app Chromium gallery DOM: 40 generated previews, zero legacy previews, zero page overflow. Gallery visually reviewed.
- Eleven representative cases checked at 390px: blastjam, tilesort, tadafish, undead, soundmag, sweep, woxs, lacetti-link, fluger-kids, myrazom, voznesensk. No horizontal overflow or extra device frame around generated scenes. DiaMirror also visually reviewed at 390px. DiaApp generated hero opens correctly in the full-size viewer; Escape closes it.
- Desktop case spot checks passed. Exhaustive desktop browser traversal encountered browser-control timeouts; not claimed as a completed full browser suite. All-project file and data checks passed. Firefox and real mobile devices were not tested.
- Generative detail can differ from source UI; original screenshots remain available for precise inspection. In particular, Gunbit omits the small MapName label, and CargoTracker combines content from its composed reference. These are presentation images, not byte-exact runtime captures.
