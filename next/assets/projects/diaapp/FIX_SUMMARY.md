# DiaApp Red/Low-State Data Positioning Fix

## Issue
The "3.4" reading with downward arrow in the low-state (red background) portfolio screenshot was positioned incorrectly:
- **Previous position**: x=220-650, y=220-350 (top-left area, with large empty space below)
- **Native position**: x=100-500, y=300-550 (centered vertically in left portion of screen)

The reading was moved too far UP and too far RIGHT, creating an inconsistent layout compared to the normal/high states and not matching the native Android KidGlucoseView.kt layout where:
- cx = w * 0.25f (x ~ 384 for 1536px width)
- numberBaseline = h * 0.47f (y ~ 481 for 1024px height)

## Fix Applied
1. Used Codex image_gen to regenerate `low-artwork.png` with correct positioning
   - Moved "3.4" reading DOWN to vertical middle of screen
   - Positioned in left-center area matching native layout
   - Preserved all other elements: red gradient background, yellow puppy character, juice box, Ukrainian text

2. Regenerated portfolio screenshots via `capture-diaapp.py`:
   - `current.png` - normal/green state (6.2)
   - `low.png` - low/red state (3.4) 
   - `high.png` - high/yellow state (12.1)

3. Updated test assertions in `diaapp-graph.py`:
   - Changed crop region from `(220,220,650,350)` to `(100,300,500,550)`
   - Updated assertion message to reflect correct positioning verification

## Files Modified
- `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Portfolio/next/assets/projects/diaapp/low-artwork.png` - corrected via Codex image_gen
- `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Portfolio/next/assets/projects/diaapp/low.png` - regenerated
- `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Portfolio/next/tests/diaapp-graph.py` - updated region coordinates and assertion

## Files Preserved
- Backup: `low-artwork.BEFORE-FIX.png` (original incorrect version)
- Source: `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/DiaApp/ui-concept/gen_low.png` (unchanged)

## Verification
✓ Visual inspection: Corrected image matches original gen_low.png positioning
✓ Consistency: Low state (3.4) now aligns with current (6.2) and high (12.1) states
✓ Test passage: `diaapp-graph.py` PASS - all three screens have visible history, colored segments, correct values
✓ Additional tests: `additional-projects.py` PASS - 32 case states, 4 projects, timeline and gallery OK

## Generated Image Path
- Codex generation: `/tmp/diaapp_low_corrected.png`
- Current deployment: `/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Portfolio/next/assets/projects/diaapp/low-artwork.png`
- Output in portfolio: `next/assets/projects/diaapp/low.png`
