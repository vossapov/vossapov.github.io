# DiaApp portfolio evidence

- `current.png` / `high.png`: portfolio derivatives of `DiaApp/ui-concept/gen_inrange.png` / `gen_high.png`. `low.png` uses the native image edit `low-artwork.png`: the rejected excessively high/right reading was moved down/left into a coherent block above the warning pill. This is an optical composition, not an exact reproduction of native text coordinates. Original DiaApp files remain unchanged.
- `low-artwork.png`: unchanged native Codex image_gen output from `/home/vossapov/.codex/generated_images/01a11bae-00ee-7813-ab48-56d525a036d8/exec-4486bcf9-70ff-4a4f-ae25-6f6bf4fb55fd.png`, SHA256 `fd7399d68dc578410043baaeb4536c2778af169cbc315e8a5d2fca100327669b`. No programmatic inpainting or background removal. `low-artwork.BEFORE-FIX.png` preserves the rejected version. Parent visually checked the regenerated low screen and refreshed the overview after the correction.
- All three screens include a portfolio-only history reconstruction informed by `KidGlucoseView.kt:drawGraphCard`, refined with a fixed 0–20 scale, hourly ticks, faint range/grid, thin threshold-coloured trace and endpoint marker. These are presentation reconstructions, NOT native runtime screenshots.
- `graph-demo.json`: explicitly synthetic 240 one-minute readings per screen, final values 6.2 / 3.4 / 12.1 matching the artwork. Gradual excursions, correlated noise and quantisation replace the earlier decorative wave. Source artwork hashes and geometry are recorded. No private glucose records.
- Public demo badges and explanatory disclaimers were removed at the owner’s request; this technical provenance remains.
- Regenerate with the Playwright Python: `next/tools/capture-diaapp.py SOURCE_DIAAPP`, then `capture-case-covers.py diaapp` and both exporters. Regression: `python3 next/tests/diaapp-graph.py` checks visible chart card/curve pixels and the red low segment.
- `overview.png`: rendered from the portfolio's existing tablet mockup with `next/tools/capture-case-covers.py diaapp`.
- Sources inspected: `ui-concept/LAYOUT.md`, `KID_IMPL_NOTES.md`, native `app/src/main/res/layout/activity_kid.xml`.
- Separate from DiaMirror (shared web/mobile viewing) and Fluger (radar UI). July–August 2026 is portfolio placement, not a claim about asset creation dates.
- No live device, medical history, sensor connection or source-app modification used. Illustrated low-glucose prompts are a visual concept, not medical advice.

- Final follow-up native edit makes the warning pill shorter/narrower, clearing the history card while preserving the corrected reading. Parent visual review and independent Claude approval: `claude-final-review.json`. Negative pixel regression rejects the old high/right reading placement.
