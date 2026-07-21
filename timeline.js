// ═══════════════════════════════════════════════════════════════
//  TIMELINE v2 — "Slot-Capsule Grid"
//
//  Geometry model:
//  · 1 month = PX px. Every project owns a time-exact SLOT
//    (slotH = months × PX) positioned at its real dates.
//  · The visible card fills its slot inset by GAP/2 (10px) at
//    both ends → consecutive same-column cards always show an
//    exact 20px gap, by construction (slots share boundaries).
//  · Inside the card a constant-height CAPSULE (161px) holds the
//    uniform content block — identical element set on every card.
//    Min slot = 2 months = 200px → min card = 180px ≥ 161px, so
//    clipping is impossible. A dotted "duration rail" fills the
//    remainder of tall cards.
//  · Company band headers occupy NON-TIMELINE space: every band
//    edge and slot is shifted down by HEADER_H for each same-side
//    band that ends more recently (shiftAt) — consecutive bands
//    still meet exactly.
//  Constants below must stay in sync with style.css (.pc-capsule).
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────
//  LAYOUT CONSTANTS
// ─────────────────────────────────────────
const PX         = 100;  // px per month (round number → auditable math)
const PAD_TOP    = 100;  // space above NOW
const PAD_BOTTOM = 100;  // space below the last visible month
const HEADER_H   = 64;   // band header strip height (non-timeline space)
const GAP        = 20;   // visible gap between consecutive cards (GAP/2 inset per slot end)
const G_COLS     = 3;    // global columns per half-side (equal widths everywhere)
const COL_GAP    = 16;   // gap between columns
const AXIS_CLEAR = 40;   // axis center → first card edge (clears year pills)
const OUTER_PAD  = 16;   // band outer edge → last column
const CAPSULE_H  = 161;  // fixed content block height (see style.css)
const NOW        = [2026, 9];   // sentinel for "Present" (ongoing) — chart top; Present shows only for e === NOW (by reference)
const BOTTOM     = [2017, 8];

// ─────────────────────────────────────────
//  DATE HELPERS
// ─────────────────────────────────────────
const mn        = ([y, m]) => y * 12 + m;
const monthsIn  = (s, e)   => mn(e) - mn(s);
const yp        = ([y, m]) => PAD_TOP + ((NOW[0] - y) * 12 + (NOW[1] - m)) * PX;
const overlaps  = (a, b)   => mn(a.s) < mn(b.e) && mn(a.e) > mn(b.s);

// ─────────────────────────────────────────
//  ASSET MAPS  (root-absolute paths)
// ─────────────────────────────────────────
const COMPANY_LOGOS = {
  whimsy:    '/assets/companies/whimsy-games.svg',
  argentics: '/assets/companies/argentics.svg',
  fg:        '/assets/companies/fg-factory.png',
  room8:     '/assets/companies/room8-studio.svg',
};

// Composed mobile-card previews for portrait-first projects:
// 3 full screens side by side on the site background (generated, not AI).
const PROJECT_COVERS = {
  /* BEHANCE:covers */
  audiostore: '/assets/covers/audiostore.jpg',
  soundmag: '/assets/covers/soundmag.jpg',
  mykolaivid: '/assets/covers/mykolaivid.jpg',
  boomerang: '/assets/covers/boomerang.jpg',
  woxs: '/assets/covers/woxs.jpg',
  voznesenskcity: '/assets/covers/voznesenskcity.jpg',
  cargotracker: '/assets/covers/cargotracker.jpg',
  routeschemes: '/assets/covers/routeschemes.jpg',
  anthracite: '/assets/covers/anthracite.jpg',
  voskresensk: '/assets/covers/voskresensk.jpg',

  blastjam: '/assets/covers/blastjam.jpg',
  tilesort: '/assets/covers/tilesort.jpg',
  halfgod:  '/assets/covers/halfgod.jpg',
  myrazom:  '/assets/covers/myrazom.jpg',
  voznesensk: '/assets/covers/voznesensk.jpg',
  montage:  '/assets/covers/montage.jpg',
  onlyriffs: '/assets/covers/onlyriffs.jpg',
  hyperian: '/assets/covers/hyperian.jpg',
  jelly:    '/assets/covers/jelly.jpg',
  gunbit:   '/assets/covers/gunbit.jpg',
  nugget:   '/assets/covers/nugget.jpg',
  domblk:   '/assets/covers/domblk.jpg',
};

const PROJECT_THUMBS = {
  /* BEHANCE:thumbs */
  audiostore: '/assets/screenshots/audiostore/audiostore-1.jpg',
  soundmag: '/assets/screenshots/soundmag/soundmag-1.jpg',
  mykolaivid: '/assets/screenshots/mykolaivid/mykolaivid-2.jpg',
  boomerang: '/assets/screenshots/boomerang/boomerang-3.jpg',
  woxs: '/assets/screenshots/woxs/woxs-3.jpg',
  voznesenskcity: '/assets/screenshots/voznesenskcity/voznesenskcity-1.jpg',
  cargotracker: '/assets/screenshots/cargotracker/cargotracker-1.jpg',
  routeschemes: '/assets/screenshots/routeschemes/routeschemes-2.jpg',
  anthracite: '/assets/screenshots/anthracite/anthracite-1.jpg',
  voskresensk: '/assets/screenshots/voskresensk/voskresensk-2.jpg',

  hyperian: '/assets/screenshots/hyperian/hyperian-logo.jpg',
  montage: '/assets/screenshots/montage/montage-3.jpg',
  onlyriffs: '/assets/screenshots/onlyriffs/onlyriffs-1.jpg',
  voznesensk: '/assets/screenshots/voznesensk/voznesensk-logo.jpg',
  myrazom: '/assets/screenshots/myrazom/myrazom-logo.jpg',
  halfgod: '/assets/screenshots/halfgod/halfgod-logo.jpg',
  blastjam: '/assets/screenshots/blastjam/blastjam-1.jpg',
  tilesort: '/assets/screenshots/tilesort/tilesort-1.jpg',
  tadafish: '/assets/screenshots/tadafish/tadafish-5.jpg',
  undead:  '/assets/projects/undead.png',
  jelly:   '/assets/projects/jelly-valley.png',
  meegos:  '/assets/projects/meegos.png',
  winday:  '/assets/projects/winday.png',
  evio:    '/assets/projects/evio.png',
  nftisls: '/assets/projects/nft-islands.png',
  racer:   '/assets/projects/racer-club.png',
  tantra:  '/assets/projects/tantra.png',
  funrun:  '/assets/screenshots/figma/funrun-1.jpg',
  sweep:   '/assets/screenshots/sweep/lobby.jpg',
  domblk:  '/assets/screenshots/domino/domino-1.jpg',
  nugget:  '/assets/screenshots/nugget/nugget-1.jpg',
  thinks:  '/assets/screenshots/thinks/thinks-1.jpg',
  trademule:'/assets/screenshots/trademule/trademule-1.jpg',
  simgate: '/assets/screenshots/simgate/simgate-1.jpg',
};

// AI-generated presentation mockups (ChatGPT) — used as the
// project-page hero when present; CSS device frames are the fallback.
const PROJECT_MOCKUPS = {
  /* BEHANCE:mockups */
  audiostore: '/assets/screenshots/audiostore/audiostore-1.jpg',
  soundmag: '/assets/screenshots/soundmag/soundmag-1.jpg',
  mykolaivid: '/assets/screenshots/mykolaivid/mykolaivid-2.jpg',
  boomerang: '/assets/screenshots/boomerang/boomerang-3.jpg',
  woxs: '/assets/screenshots/woxs/woxs-3.jpg',
  voznesenskcity: '/assets/screenshots/voznesenskcity/voznesenskcity-1.jpg',
  cargotracker: '/assets/screenshots/cargotracker/cargotracker-1.jpg',
  routeschemes: '/assets/screenshots/routeschemes/routeschemes-2.jpg',
  anthracite: '/assets/screenshots/anthracite/anthracite-1.jpg',
  voskresensk: '/assets/screenshots/voskresensk/voskresensk-2.jpg',

  hyperian: '/assets/screenshots/hyperian/hyperian-logo.jpg', // brand-book cover hero — dark board, no device frame
  voznesensk: '/assets/screenshots/voznesensk/voznesensk-logo.jpg', // identity board hero — brand case, no device frame
  myrazom:  '/assets/screenshots/myrazom/myrazom-logo.jpg', // identity board hero — brand case, no device frame
  halfgod:  '/assets/screenshots/halfgod/halfgod-logo.jpg', // identity board hero — brand case, no device frame
  blastjam: '/assets/mockups/blastjam-mockup.jpg',
  tilesort: '/assets/mockups/tilesort-mockup.jpg',
  tadafish: '/assets/mockups/tadafish-mockup.jpg',
  undead:   '/assets/mockups/undead-mockup.png',
  jelly:    '/assets/mockups/jelly-mockup-2.png',    // regen: portrait, single screen
  meegos:   '/assets/mockups/meegos-mockup-2.png',   // regen: clean landscape phone
  gunbit:   '/assets/mockups/gunbit-mockup.png',
  winday:   '/assets/mockups/winday-mockup.png',
  racer:    '/assets/mockups/racer-mockup.png',
  tantra:   '/assets/mockups/tantra-mockup-3.png',   // regen from real Figma HUD
  evio:     '/assets/mockups/evio-mockup-2.png',     // regen from real Figma FPS screen
  nftisls:  '/assets/mockups/nftisls-mockup.png',
  casino24: '/assets/mockups/casino24-mockup-2.png', // regen: landscape phone
  domblk:   '/assets/mockups/domblk-mockup-2.jpg',    // regen: portrait phone — Dominoes for Cash home
  funrun:   '/assets/mockups/funrun-mockup-2.jpg',    // regen: real 3D phone, screen coplanar with frame
  sweep:    '/assets/mockups/sweep-mockup.jpg',        // browser-frame hero of the dark hi-fi lobby
  nugget:   '/assets/mockups/nugget-mockup.jpg',       // portrait phone — mining slot main game
  thinks:   '/assets/mockups/thinks-mockup.jpg',       // browser hero — THINKS landing
  trademule:'/assets/mockups/trademule-mockup.jpg',    // browser hero — TradeMule landing
  simgate:  '/assets/mockups/simgate-mockup.jpg',      // browser hero — SimGate workspace
};

// native/ = the designer's own full-res source screens (imported from
// his portfolio Drive); web/ = official store captures used only where
// no native screens exist (evio browser, nftisls & winday web).
const PROJECT_SCREENS = {
  /* BEHANCE:screens */
  audiostore: [
    '/assets/screenshots/audiostore/audiostore-1.jpg',
  ],
  soundmag: [
    '/assets/screenshots/soundmag/soundmag-1.jpg',
    '/assets/screenshots/soundmag/soundmag-2.jpg',
    '/assets/screenshots/soundmag/soundmag-3.jpg',
    '/assets/screenshots/soundmag/soundmag-4.jpg',
    '/assets/screenshots/soundmag/soundmag-5.jpg',
    '/assets/screenshots/soundmag/soundmag-6.jpg',
    '/assets/screenshots/soundmag/soundmag-7.jpg',
  ],
  mykolaivid: [
    '/assets/screenshots/mykolaivid/mykolaivid-1.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-2.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-3.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-4.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-5.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-6.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-7.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-8.jpg',
    '/assets/screenshots/mykolaivid/mykolaivid-9.jpg',
  ],
  boomerang: [
    '/assets/screenshots/boomerang/boomerang-1.jpg',
    '/assets/screenshots/boomerang/boomerang-2.jpg',
    '/assets/screenshots/boomerang/boomerang-3.jpg',
    '/assets/screenshots/boomerang/boomerang-4.jpg',
    '/assets/screenshots/boomerang/boomerang-5.jpg',
  ],
  woxs: [
    '/assets/screenshots/woxs/woxs-1.jpg',
    '/assets/screenshots/woxs/woxs-2.jpg',
    '/assets/screenshots/woxs/woxs-3.jpg',
    '/assets/screenshots/woxs/woxs-4.jpg',
    '/assets/screenshots/woxs/woxs-5.jpg',
    '/assets/screenshots/woxs/woxs-6.jpg',
    '/assets/screenshots/woxs/woxs-7.jpg',
  ],
  voznesenskcity: [
    '/assets/screenshots/voznesenskcity/voznesenskcity-1.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-2.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-3.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-4.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-5.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-6.jpg',
    '/assets/screenshots/voznesenskcity/voznesenskcity-7.jpg',
  ],
  cargotracker: [
    '/assets/screenshots/cargotracker/cargotracker-1.jpg',
    '/assets/screenshots/cargotracker/cargotracker-2.jpg',
    '/assets/screenshots/cargotracker/cargotracker-3.jpg',
  ],
  routeschemes: [
    '/assets/screenshots/routeschemes/routeschemes-1.jpg',
    '/assets/screenshots/routeschemes/routeschemes-2.jpg',
    '/assets/screenshots/routeschemes/routeschemes-3.jpg',
    '/assets/screenshots/routeschemes/routeschemes-4.jpg',
    '/assets/screenshots/routeschemes/routeschemes-5.jpg',
    '/assets/screenshots/routeschemes/routeschemes-6.jpg',
  ],
  anthracite: [
    '/assets/screenshots/anthracite/anthracite-1.jpg',
    '/assets/screenshots/anthracite/anthracite-2.jpg',
    '/assets/screenshots/anthracite/anthracite-3.jpg',
    '/assets/screenshots/anthracite/anthracite-4.jpg',
    '/assets/screenshots/anthracite/anthracite-5.jpg',
    '/assets/screenshots/anthracite/anthracite-6.jpg',
    '/assets/screenshots/anthracite/anthracite-7.jpg',
    '/assets/screenshots/anthracite/anthracite-8.jpg',
    '/assets/screenshots/anthracite/anthracite-9.jpg',
  ],
  voskresensk: [
    '/assets/screenshots/voskresensk/voskresensk-1.jpg',
    '/assets/screenshots/voskresensk/voskresensk-2.jpg',
    '/assets/screenshots/voskresensk/voskresensk-3.jpg',
    '/assets/screenshots/voskresensk/voskresensk-4.jpg',
    '/assets/screenshots/voskresensk/voskresensk-5.jpg',
    '/assets/screenshots/voskresensk/voskresensk-6.jpg',
    '/assets/screenshots/voskresensk/voskresensk-7.jpg',
    '/assets/screenshots/voskresensk/voskresensk-8.jpg',
  ],

  hyperian: [
    '/assets/screenshots/hyperian/hyperian-logo.jpg',
    '/assets/screenshots/hyperian/hyperian-horizontal.jpg',
    '/assets/screenshots/hyperian/hyperian-vertical.jpg',
    '/assets/screenshots/hyperian/hyperian-palette.jpg',
    '/assets/screenshots/hyperian/hyperian-access.jpg',
    '/assets/screenshots/hyperian/hyperian-usage.jpg',
    '/assets/screenshots/hyperian/hyperian-type.jpg',
    '/assets/screenshots/hyperian/hyperian-typeuse.jpg',
    '/assets/screenshots/hyperian/hyperian-app-1.jpg',
    '/assets/screenshots/hyperian/hyperian-app-2.jpg',
    '/assets/screenshots/hyperian/hyperian-app-3.jpg',
    '/assets/screenshots/hyperian/hyperian-app-4.jpg',
    '/assets/screenshots/hyperian/hyperian-app-5.jpg',
    '/assets/screenshots/hyperian/hyperian-app-6.jpg',
    '/assets/screenshots/hyperian/hyperian-app-7.jpg',
  ],
  montage: [
    '/assets/screenshots/montage/montage-3.jpg',
    '/assets/screenshots/montage/montage-1.jpg',
    '/assets/screenshots/montage/montage-2.jpg',
    '/assets/screenshots/montage/montage-4.jpg',
    '/assets/screenshots/montage/montage-5.jpg',
    '/assets/screenshots/montage/montage-6.jpg',
    '/assets/screenshots/montage/montage-7.jpg',
    '/assets/screenshots/montage/montage-8.jpg',
    '/assets/screenshots/montage/montage-9.jpg',
    '/assets/screenshots/montage/montage-10.jpg',
    '/assets/screenshots/montage/montage-11.jpg',
    '/assets/screenshots/montage/montage-12.jpg',
    '/assets/screenshots/montage/montage-14.jpg',
  ],
  onlyriffs: [
    '/assets/screenshots/onlyriffs/onlyriffs-1.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-2.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-3.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-4.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-5.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-6.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-7.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-8.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-9.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-10.jpg',
    '/assets/screenshots/onlyriffs/onlyriffs-11.jpg',
  ],
  voznesensk: [
    '/assets/screenshots/voznesensk/voznesensk-logo.jpg',
    '/assets/screenshots/voznesensk/voznesensk-construction.jpg',
    '/assets/screenshots/voznesensk/voznesensk-palette.jpg',
    '/assets/screenshots/voznesensk/voznesensk-type.jpg',
    '/assets/screenshots/voznesensk/voznesensk-slogan.jpg',
    '/assets/screenshots/voznesensk/voznesensk-elements.jpg',
    '/assets/screenshots/voznesensk/voznesensk-totes.jpg',
    '/assets/screenshots/voznesensk/voznesensk-merch.jpg',
    '/assets/screenshots/voznesensk/voznesensk-explore.jpg',
    '/assets/screenshots/voznesensk/voznesensk-concepts.jpg',
  ],
  myrazom: [
    '/assets/screenshots/myrazom/myrazom-logo.jpg',
    '/assets/screenshots/myrazom/myrazom-mark.jpg',
    '/assets/screenshots/myrazom/myrazom-palette.jpg',
    '/assets/screenshots/myrazom/myrazom-elements.jpg',
    '/assets/screenshots/myrazom/myrazom-social.jpg',
    '/assets/screenshots/myrazom/myrazom-citylight.jpg',
    '/assets/screenshots/myrazom/myrazom-van.jpg',
    '/assets/screenshots/myrazom/myrazom-print.jpg',
    '/assets/screenshots/myrazom/myrazom-lettering.jpg',
    '/assets/screenshots/myrazom/myrazom-hoodie.jpg',
    '/assets/screenshots/myrazom/myrazom-tshirt.jpg',
    '/assets/screenshots/myrazom/myrazom-tote.jpg',
    '/assets/screenshots/myrazom/myrazom-badge.jpg',
    '/assets/screenshots/myrazom/myrazom-wristband.jpg',
    '/assets/screenshots/myrazom/myrazom-socks.jpg',
  ],
  halfgod: [
    '/assets/screenshots/halfgod/halfgod-logo.jpg',
    '/assets/screenshots/halfgod/halfgod-marks.jpg',
    '/assets/screenshots/halfgod/halfgod-mark.jpg',
    '/assets/screenshots/halfgod/halfgod-palette.jpg',
    '/assets/screenshots/halfgod/halfgod-type.jpg',
    '/assets/screenshots/halfgod/halfgod-pattern.jpg',
    '/assets/screenshots/halfgod/halfgod-1.jpg',
    '/assets/screenshots/halfgod/halfgod-9.jpg',
    '/assets/screenshots/halfgod/halfgod-3.jpg',
    '/assets/screenshots/halfgod/halfgod-4.jpg',
    '/assets/screenshots/halfgod/halfgod-10.jpg',
    '/assets/screenshots/halfgod/halfgod-2.jpg',
    '/assets/screenshots/halfgod/halfgod-5.jpg',
    '/assets/screenshots/halfgod/halfgod-6.jpg',
    '/assets/screenshots/halfgod/halfgod-7.jpg',
    '/assets/screenshots/halfgod/halfgod-8.jpg',
  ],
  blastjam: [
    '/assets/screenshots/blastjam/blastjam-1.jpg',
    '/assets/screenshots/blastjam/blastjam-2.jpg',
    '/assets/screenshots/blastjam/blastjam-3.jpg',
    '/assets/screenshots/blastjam/blastjam-4.jpg',
  ],
  tilesort: [
    '/assets/screenshots/tilesort/tilesort-1.jpg',
    '/assets/screenshots/tilesort/tilesort-2.jpg',
    '/assets/screenshots/tilesort/tilesort-3.jpg',
    '/assets/screenshots/tilesort/tilesort-4.jpg',
    '/assets/screenshots/tilesort/tilesort-5.jpg',
    '/assets/screenshots/tilesort/tilesort-6.jpg',
    '/assets/screenshots/tilesort/tilesort-7.jpg',
    '/assets/screenshots/tilesort/tilesort-8.jpg',
    '/assets/screenshots/tilesort/tilesort-9.jpg',
  ],
  tadafish: [
    '/assets/screenshots/tadafish/tadafish-1.jpg',
    '/assets/screenshots/tadafish/tadafish-2.jpg',
    '/assets/screenshots/tadafish/tadafish-3.jpg',
    '/assets/screenshots/tadafish/tadafish-4.jpg',
  ],
  undead: [
    '/assets/screenshots/native/undead-1.jpg',
    '/assets/screenshots/native/undead-2.jpg',
    '/assets/screenshots/native/undead-3.jpg',
    '/assets/screenshots/native/undead-4.jpg',
  ],
  jelly: [
    '/assets/screenshots/native/jelly-1.jpg',
    '/assets/screenshots/native/jelly-2.jpg',
    '/assets/screenshots/native/jelly-3.jpg',
    '/assets/screenshots/native/jelly-4.jpg',
    '/assets/screenshots/native/jelly-5.jpg',
    '/assets/screenshots/native/jelly-6.jpg',
  ],
  meegos: [
    '/assets/screenshots/native/meegos-1.jpg',
    '/assets/screenshots/native/meegos-2.jpg',
    '/assets/screenshots/native/meegos-3.jpg',
    '/assets/screenshots/native/meegos-4.jpg',
    '/assets/screenshots/native/meegos-5.jpg',
  ],
  gunbit: [
    '/assets/screenshots/native/gunbit-1.jpg',
    '/assets/screenshots/native/gunbit-2.jpg',
    '/assets/screenshots/native/gunbit-3.jpg',
    '/assets/screenshots/native/gunbit-4.jpg',
    '/assets/screenshots/native/gunbit-5.jpg',
    '/assets/screenshots/native/gunbit-6.jpg',
  ],
  casino24: [
    '/assets/screenshots/native/casino24-1.jpg',
    '/assets/screenshots/native/casino24-2.jpg',
    '/assets/screenshots/native/casino24-3.jpg',
    '/assets/screenshots/native/casino24-4.jpg',
    '/assets/screenshots/native/casino24-5.jpg',
  ],
  tantra: [
    '/assets/screenshots/figma/tantra-2.jpg',
    '/assets/screenshots/figma/tantra-3.jpg',
    '/assets/screenshots/figma/tantra-5.jpg',
    '/assets/screenshots/figma/tantra-1.jpg',
    '/assets/screenshots/figma/tantra-4.jpg',
    '/assets/screenshots/figma/tantra-6.jpg',
  ],
  funrun: [
    '/assets/screenshots/figma/funrun-1.jpg',
    '/assets/screenshots/figma/funrun-2.jpg',
    '/assets/screenshots/figma/funrun-4.jpg',
    '/assets/screenshots/figma/funrun-3.jpg',
    '/assets/screenshots/figma/funrun-5.jpg',
    '/assets/screenshots/funrun/concept-1.jpg',
    '/assets/screenshots/funrun/concept-2.jpg',
    '/assets/screenshots/funrun/concept-3.jpg',
  ],
  sweep: [
    '/assets/screenshots/sweep/lobby.jpg',
    '/assets/screenshots/sweep/providers.jpg',
    '/assets/screenshots/sweep/banner.jpg',
    '/assets/screenshots/sweep/lobby-light.jpg',
    '/assets/screenshots/sweep/tasks-light.jpg',
    '/assets/screenshots/sweep/wallet-light.jpg',
    '/assets/screenshots/sweep/admin.jpg',
    '/assets/screenshots/sweep/admin-2.jpg',
  ],
  nugget: [
    '/assets/screenshots/nugget/nugget-1.jpg',
    '/assets/screenshots/nugget/nugget-2.jpg',
    '/assets/screenshots/nugget/nugget-3.jpg',
    '/assets/screenshots/nugget/nugget-4.jpg',
    '/assets/screenshots/nugget/nugget-5.jpg',
    '/assets/screenshots/nugget/nugget-6.jpg',
  ],
  thinks: [
    '/assets/screenshots/thinks/thinks-1.jpg',
    '/assets/screenshots/thinks/thinks-2.jpg',
    '/assets/screenshots/thinks/thinks-3.jpg',
  ],
  trademule: [
    '/assets/screenshots/trademule/trademule-1.jpg',
    '/assets/screenshots/trademule/trademule-2.jpg',
    '/assets/screenshots/trademule/trademule-3.jpg',
  ],
  simgate: [
    '/assets/screenshots/simgate/simgate-1.jpg',
    '/assets/screenshots/simgate/simgate-2.jpg',
    '/assets/screenshots/simgate/simgate-3.jpg',
    '/assets/screenshots/simgate/simgate-4.jpg',
    '/assets/screenshots/simgate/simgate-5.jpg',
  ],
  racer: [
    '/assets/screenshots/native/racer-1.jpg',
    '/assets/screenshots/native/racer-2.jpg',
    '/assets/screenshots/native/racer-3.jpg',
    '/assets/screenshots/native/racer-4.jpg',
    '/assets/screenshots/native/racer-5.jpg',
  ],
  domblk: [
    '/assets/screenshots/domino/domino-1.jpg',
    '/assets/screenshots/domino/domino-2.jpg',
    '/assets/screenshots/domino/domino-3.jpg',
    '/assets/screenshots/domino/domino-4.jpg',
    '/assets/screenshots/domino/domino-5.jpg',
    '/assets/screenshots/domino/domino-6.jpg',
  ],
  // no native source — official web captures
  winday: [
    '/assets/screenshots/web/winday-web-3.png',
    '/assets/screenshots/web/winday-web-1.png',
    '/assets/screenshots/web/winday-web-2.png',
    '/assets/screenshots/web/winday-web-4.png',
  ],
  evio: [
    '/assets/screenshots/figma/evio-1.jpg',
    '/assets/screenshots/figma/evio-2.jpg',
    '/assets/screenshots/figma/evio-3.jpg',
    '/assets/screenshots/figma/evio-5.jpg',
    '/assets/screenshots/figma/evio-4.jpg',
  ],
  nftisls: [
    '/assets/screenshots/web/nftisls-web-1.png',
    '/assets/screenshots/web/nftisls-web-2.png',
    '/assets/screenshots/web/nftisls-web-3.png',
    '/assets/screenshots/web/nftisls-web-4.png',
  ],
};

// ─────────────────────────────────────────
//  PROJECT DETAIL CONTENT
//  bullets = "What I did" list (EN/UA); stats = store presence
//  (filled from real research — empty entry hides the panel).
// ─────────────────────────────────────────
const PROJECT_BULLETS = {
  /* BEHANCE:bullets */
  audiostore: [
    ["Cover set on a dark rippled-sand texture", "Обкладинка на темній фактурі хвилястого піску"],
    ["Orange vertical accent bar beside the title", "Помаранчева вертикальна акцентна смуга біля заголовка"],
    ["Bold filled and outlined uppercase lettering", "Жирний заповнений і контурний прописний шрифт"],
    ["Closing cards in white and red type", "Завершальні картки з білим і червоним написом"],
  ],
  soundmag: [
    ["Wordmark with tagline \"Trust your ears\" and play-triangle mark", "Логотип зі слоганом «Вір своїм ушам» і знаком-трикутником play"],
    ["Palette: #F69707, #DA4E23, #403F3F, #FFFFFF; type PT Sans", "Палітра: #F69707, #DA4E23, #403F3F, #FFFFFF; шрифт PT Sans"],
    ["Print set: business cards, gift box, stickers, gift card, brochure", "Друк: візитки, подарункова коробка, наліпки, сертифікат, брошура"],
    ["E-commerce website and outdoor citylight advertising", "Інтернет-магазин і зовнішня реклама-сітілайт"],
    ["Christmas set: window decoration and seasonal logo", "Різдвяний набір: оформлення вітрини й сезонний логотип"],
  ],
  mykolaivid: [
    ["Palette of yellow, purple, blue, grey and white", "Палітра з жовтого, фіолетового, синього, сірого й білого"],
    ["Typeface: Amazing Grotesk", "Шрифт: Amazing Grotesk"],
    ["Three card types: payment, travel, ID", "Три типи карток: платіжна, проїзний, ID"],
    ["3D city landmark and transport elements", "3D-елементи з міською пам'яткою та транспортом"],
    ["Print, sticker, web and social applications", "Застосування в друці, стікерах, вебі та соцмережах"],
  ],
  boomerang: [
    ["Chevron logo with boomerang-store.com.ua wordmark", "Логотип-шеврон із написом boomerang-store.com.ua"],
    ["Red, black and white palette", "Палітра червоного, чорного й білого"],
    ["Web and mobile store interfaces", "Інтерфейси веб- і мобільної версій магазину"],
    ["Ad banners and Facebook page mockup", "Рекламні банери та макет сторінки Facebook"],
  ],
  woxs: [
    ["X-shaped logo with Proxima Nova wordmark", "Логотип у формі X зі шрифтом Proxima Nova"],
    ["Blue, red and white color palette", "Синьо-червоно-біла кольорова палітра"],
    ["Full homepage and service-page mockups", "Повні макети головної та сторінок послуг"],
    ["Package landing pages: Startup, Gigant", "Лендинги пакетів: Стартап, Гігант"],
    ["Freelance work, published April 2019", "Фриланс-робота, опублікована у квітні 2019"],
  ],
  voznesenskcity: [
    ["Bird-in-shield coat-of-arms mark", "Герб із птахом у щиті"],
    ["Wordmark with the line \"blooming city\"", "Логотип із рядком \"квітуче місто\""],
    ["Floral border pattern and icon set", "Квітковий бордюрний патерн і набір іконок"],
    ["Four-colour palette, one blue lead", "Чотириколірна палітра з провідним синім"],
    ["Cap, mug and resident-card mockups", "Мокапи кепки, чашок і картки вознесенця"],
  ],
  cargotracker: [
    ["Prototype freight-tracking mobile app", "Прототип мобільного застосунку для відстеження вантажів"],
    ["Purple #B47EC2 and gray #F4F4F4 palette", "Палітра: фіолетовий #B47EC2 та сірий #F4F4F4"],
    ["Proxima Nova typeface", "Шрифт Proxima Nova"],
    ["Five-step delivery status timeline", "П'ятиетапна шкала статусу доставки"],
    ["Driver profile, map and order-history screens", "Екрани профілю водія, карти та історії замовлень"],
  ],
  routeschemes: [
    ["Self-initiated project, freelance, published October 2020", "Ініціативний проєкт, фриланс, опубліковано у жовтні 2020"],
    ["300+ hours spent on the route schemes", "Понад 300 годин, витрачених на схеми маршрутів"],
    ["Alpha map drew about 100 public comments", "Альфа-карта зібрала близько 100 коментарів"],
    ["Formats span A4, A3, A0 and wide-line layouts", "Формати охоплюють A4, A3, A0 та широкоформатні макети"],
    ["Delivered in dark and white modes", "Виконано в темному та світлому режимах"],
  ],
  anthracite: [
    ["One-line script wordmark paired with Futura PT", "Однолінійний рукописний логотип у парі з Futura PT"],
    ["Anthracite-grey palette anchored on #393D47", "Антрацитово-сіра палітра на основі #393D47"],
    ["Continuous line-art illustration across every surface", "Безперервна лінійна ілюстрація на всіх носіях"],
    ["Packaging, apparel, signage and social templates", "Упаковка, одяг, вивіски та шаблони для соцмереж"],
  ],
  voskresensk: [
    ["Circular mark: figures around a central orange sun", "Колова емблема: фігурки навколо помаранчевого сонця"],
    ["Palette taken from local traditional embroidery", "Палітра взята з місцевої традиційної вишивки"],
    ["Organic blue-orange blob pattern", "Органічний синьо-помаранчевий патерн із крапель"],
    ["Applied to merch, signage, transport and city entrance", "Застосовано на мерчі, навігації, транспорті та в’їзному знаку"],
  ],

  hyperian: [
    ['Built the brand system: logo with construction grids, WCAG-checked palette, Metropolis type ramp', 'Побудував бренд-систему: лого з сітками побудови, палітра з перевіркою WCAG, шрифтова шкала Metropolis'],
    ['Designed the dashboard: 3D battery render, charge percentage, estimated charge time', 'Спроєктував дашборд: 3D-рендер батареї, відсоток заряду й час до повного заряду'],
    ['Energy flow views: solar generation, home consumption and grid export in real units', 'Екрани потоку енергії: генерація панелей, споживання будинку та експорт у мережу'],
    ['Three operating modes: Economy, Balanced, Profited', 'Три режими роботи: Economy, Balanced і Profited'],
    ['Self-powered share and daily export earnings on one screen', 'Частка самозабезпечення й денний заробіток з експорту на одному екрані'],
  ],
  montage: [
    ['Structured the app around three categories — chill, connect, charge — from onboarding to tab bar', 'Побудував застосунок довкола трьох категорій — chill, connect, charge — від онбордингу до таб-бару'],
    ['Designed the audio player: waveform scrubber, 10-second skips, shuffle, repeat-one', 'Спроєктував аудіоплеєр: хвильовий скрабер, перемотування на 10 секунд, шафл і повтор треку'],
    ['Built habit goals from repeatable actions with +10 EXP rewards', 'Зібрав цілі звичок із повторюваних дій з нагородою +10 EXP'],
    ['Designed the profile: 45-day streak, level, per-category point rings', 'Спроєктував профіль: серія з 45 днів, рівень і кільця балів за категоріями'],
    ['Kept a purple gradient palette and rounded type across all 11 screens', 'Витримав фіолетову градієнтну палітру й округлий шрифт на всіх 11 екранах'],
  ],
  onlyriffs: [
    ['Designed 8 desktop screens at 1440px: login, profiles, player, settings, admin', 'Спроєктував 8 десктопних екранів на 1440px: вхід, профілі, плеєр, налаштування, адмінка'],
    ['Profiles with posts, video and photo tabs, threaded comments and tags', 'Профілі з вкладками дописів, відео й фото, гілками коментарів і тегами'],
    ['Per-video pricing: free, paid or followers-only', 'Ціна за відео: безкоштовно, платно або лише для підписників'],
    ['Collaboration credits on posts, videos and playlists', 'Позначки співавторів у дописах, відео та плейлистах'],
    ['Admin panel with user blocking and reports', 'Адмін-панель із блокуванням користувачів і скаргами'],
  ],
  voznesensk: [
    ['Designed the logomark: a heart formed by two people, plus the horizontal wordmark', 'Розробив знак: серце з двох людей, і горизонтальний лого-блок'],
    ['Defined the purple, amber and orange palette', 'Визначив палітру: фіолетовий, бурштиновий, помаранчевий'],
    ['Set Lugatype as the display face and styled the «...сміливість діяти» slogan', 'Обрав Lugatype як дисплейну гарнітуру та оформив гасло «...сміливість діяти»'],
    ['Built a geometric pattern and a line-icon set for programs', 'Побудував геометричний патерн та набір лінійних іконок для програм'],
    ['Explored logo directions — wings, community, heart — before the final mark', 'Опрацював напрями лого — крила, спільнота, серце — до фінального знака'],
    ['Applied the identity to tote bags, mugs, hoodies and campaign layouts', 'Переніс айдентику на шопери, кухлі, худі та кампанійні макети'],
  ],
  myrazom: [
    ['Designed the mark: a yellow heart merging into the letter M', 'Розробив знак: жовте серце, що переходить у літеру М'],
    ['Built the logo system: horizontal and vertical lockups on light and navy', 'Побудував систему лого: горизонтальний і вертикальний блоки на світлому й темному'],
    ['Defined the blue-yellow-navy palette, mosaic pattern and category icons', 'Визначив синьо-жовто-темносиню палітру, мозаїчний патерн та іконки категорій'],
    ['Made Instagram templates for aid categories: water, humanitarian aid, evacuation, pet food', 'Зробив шаблони Instagram для категорій допомоги: вода, гуманітарка, евакуація, корм для тварин'],
    ['Applied the identity to a citylight, van livery, print, badges and merch', 'Переніс айдентику на сітілайт, брендування буса, друк, бейджі та мерч'],
    ['Drew the «Миколаїв — місто сили» lettering for a merch line', 'Намалював летеринг «Миколаїв — місто сили» для лінійки мерчу'],
  ],
  halfgod: [
    ['Designed the stencil wordmark, star mark and ½GOD lockup', 'Розробив стенсил-логотип, знак-зірку та лого-блок ½GOD'],
    ['Defined a five-color palette with CMYK and hex values', 'Визначив палітру з пʼяти кольорів із CMYK та hex'],
    ['Set the type pair: Anurati display, Argentum Sans text', 'Підібрав шрифтову пару: Anurati для акцентів, Argentum Sans для тексту'],
    ['Built a topographic line pattern for prints', 'Створив топографічний лінійний патерн для принтів'],
    ['Applied the identity to packaging, merch and social templates', 'Переніс айдентику на пакування, мерч і шаблони соцмереж'],
  ],
  blastjam: [
    ['Home screen: top HUD, chest track, bottom nav', 'Головний екран: верхній HUD, трек скринь, нижня навігація'],
    ['Gameplay screen: board, shooter queue, booster bar', 'Ігровий екран: поле, черга шутерів, панель бустерів'],
    ['Reward and booster popups', 'Попапи нагород і бустерів'],
    ['Ad touchpoints: rewarded ×2, banner slot', 'Рекламні точки: rewarded ×2, банерний слот'],
  ],
  tilesort: [
    ['Home screen, gameplay HUD and booster panel', 'Головний екран, ігровий HUD і панель бустерів'],
    ['Win flow with reward track and coin multiplier', 'Екран перемоги з треком нагород і множником монет'],
    ['Monetization screens: shop, starter pack, remove ads', 'Екрани монетизації: магазин, стартер-пак, відключення реклами'],
    ['System popups: settings, out-of-space, loading screen', 'Системні вікна: налаштування, попап продовження, заставка'],
  ],
  tadafish: [
    ['Auto-fishing popup: target picker, filters, shot counter', 'Попап авторибалки: вибір цілі, фільтри, лічильник пострілів'],
    ['Four-tab info window: Features, Paytable, UI, Options', 'Інфо-вікно з чотирьох вкладок: Features, Paytable, UI, Options'],
    ['Feature cards with cost, effect and scoring', 'Картки фіч із вартістю, ефектом і нарахуванням'],
    ['Screen legend with callouts for every control', 'Легенда екрана з підписами всіх контролів'],
  ],
  undead: [
    ['Took over UI/UX after the previous designer left; owned the full pipeline with the PM and game designer.',
     'Прийняв UI/UX після попереднього дизайнера; вів повний цикл разом з PM та геймдизайнером.'],
    ['Wrote feature documentation, ran research and produced every mockup the dev team needed to ship new features.',
     'Готував документацію під фічі, ресерч і всі макети, потрібні команді розробки для впровадження нових фіч.'],
    ['Adapted all screens across resolutions (1080p–4K) and for Steam Deck & gamepad input.',
     'Адаптував усі екрани під роздільності (1080p–4K) та керування зі Steam Deck / геймпада.'],
    ['Set up and optimised localization into 16 languages, including per-language font adaptation.',
     'Налагодив і оптимізував локалізацію 16 мовами, включно з адаптацією шрифтів під кожну мову.'],
    ['Maintained the Figma design system, synced component libraries and supported devs with assets, popups and UI testing.',
     'Підтримував дизайн-систему у Figma, синхронізував бібліотеки, саппортив розробників асетами, попапами і тестуванням UI.'],
  ],
  jelly: [
    ['First-ever dedicated UI/UX designer on a project that had been driven intuitively by artists in Photoshop.',
     'Перший виділений UI/UX дизайнер на проєкті, що доти вівся інтуїтивно художниками у Photoshop.'],
    ['Migrated the whole team from Photoshop to a scalable Figma design system — the core challenge of the role.',
     'Перевів усю команду з Photoshop на масштабовану дизайн-систему у Figma — головний виклик ролі.'],
    ['Worked directly with the Squid Games dev team: turned feature tasks into docs, then wireframes, then final UI.',
     'Працював напряму з командою Squid Games: перетворював задачі на документацію, потім вайрфрейми і фінальний UI.'],
    ['Shipped many new screens and live-ops mechanics together with the game designer and UI artists.',
     'Випустив безліч нових екранів і live-ops механік разом з геймдизайнером та UI-артистами.'],
  ],
  meegos: [
    ['Redesigned the previous flat visual style into a brighter, more engaging look.',
     'Редизайн попереднього плаского стилю у яскравіший і залученіший вигляд.'],
    ['Designed new customization, rewards and monetization flows to boost engagement.',
     'Спроєктував нові екрани кастомізації, винагород і монетизації для залученості.'],
    ['Built the shop, season profile progression, bundle purchases and a rank system.',
     'Побудував магазин, сезонну прогресію профілю, покупку бандлів та систему рангів.'],
    ['Reworked many pages from wireframe to UI, extended the design system, tested and exported to devs.',
     'Переробив багато сторінок від вайрфрейму до UI, розширив дизайн-систему, тестував і експортував розробникам.'],
  ],
  gunbit: [
    ['Joined at the documentation stage as a UX consultant so the game designer could prepare everything needed.',
     'Зайшов на стадії документації як UX-консультант, щоб геймдизайнер підготував усе необхідне.'],
    ['Ran the full flow: screenflow → wireframes → prototypes, aligned with the dev team and client.',
     'Провів повний цикл: screenflow → вайрфрейми → прототипи, узгоджені з командою і клієнтом.'],
    ['Handled art direction — moodboards, client presentation files and review of artist deliverables.',
     'Відповідав за арт-дірекшн — мудборди, презентаційні файли для клієнта, рев’ю робіт художників.'],
    ['Produced VFX reference prototypes and delivered every final mockup to development.',
     'Створював VFX-прототипи як референс і передав усі фінальні макети в розробку.'],
  ],
  winday: [
    ['Designed an in-house B2B no-code constructor for branded gamified marketing campaigns.',
     'Спроєктував власний B2B no-code конструктор гейміфікованих маркетингових кампаній.'],
    ['Built the client side — a builder that assembles a game from chosen mechanics, branding and rewards.',
     'Побудував клієнтську частину — конструктор, що збирає гру з обраних механік, брендингу і винагород.'],
    ['Designed the admin panel for managing subscriptions and the customizable in-game UI components.',
     'Спроєктував адмін-панель керування підписками та кастомізовані ігрові UI-компоненти.'],
    ['Drove deep UX research across a year-long product engagement, from research to final handoff.',
     'Вів глибокий UX-ресерч упродовж року роботи над продуктом — від дослідження до фінального хендофу.'],
  ],
  casino24: [
    ['Designed a multiplayer domino game with real-time video chat at the table.',
     'Спроєктував мультиплеєрне доміно з відеочатом за столом у реальному часі.'],
    ['Ran the full UI pipeline: wireframes → style concept → final screens.',
     'Провів повний UI-цикл: вайрфрейми → концепт стилю → фінальні екрани.'],
    ['Built the betting table, bonus rounds and reward UI with a rich casino visual language.',
     'Побудував ігровий стіл зі ставками, бонусні раунди та UI винагород у насиченій казино-стилістиці.'],
  ],
  tantra: [
    ['Started from wireframes, then explored the visual style and built interactive prototypes.',
     'Почав з вайрфреймів, далі дослідження візуального стилю та інтерактивні прототипи.'],
    ['Delivered all UI screens for a 3D adventure RPG released on the App Store and Google Play.',
     'Здав усі UI-екрани для 3D пригодницької RPG, що вийшла в App Store і Google Play.'],
    ['Covered world map / level select, exploration HUD, NPC dialog UI and ritual gameplay screens.',
     'Охопив карту світу / вибір рівнів, HUD дослідження, UI діалогів з NPC та екрани ритуального геймплею.'],
  ],
  racer: [
    ['Built the UI/UX entirely from scratch: wireframes → game UI → HUD → all screens.',
     'Побудував UI/UX повністю з нуля: вайрфрейми → ігровий UI → HUD → усі екрани.'],
    ['Designed the in-race HUD, garage / NFT car customization and progression screens.',
     'Спроєктував гоночний HUD, гараж / кастомізацію NFT-машин та екрани прогресії.'],
    ['Integrated NFT/web3 flows into a fast, readable racing interface in about two months.',
     'Інтегрував NFT/web3 потоки у швидкий читабельний гоночний інтерфейс приблизно за два місяці.'],
  ],
  evio: [
    ['Delivered a complete UI redesign of a live multiplayer browser FPS.',
     'Виконав повний UI-редизайн живого мультиплеєрного браузерного FPS.'],
    ['Modernised the HUD, menus and match flow while the game stayed live.',
     'Модернізував HUD, меню та потік матчу, поки гра лишалася в лайві.'],
    ['Integrated blockchain / NFT elements into the interface.',
     'Інтегрував блокчейн / NFT елементи в інтерфейс.'],
  ],
  domblk: [
    ['Worked from documentation to wireframes, then produced several style concepts and moodboards.',
     'Працював від документації до вайрфреймів, далі кілька концептів стилю та мудборди.'],
    ['Took the approved direction through to final UI for a domino-blackjack hybrid.',
     'Довів обраний напрям до фінального UI для гібрида доміно-блекджек.'],
    ['Designed the table, betting and multiplayer flows for iOS and Android.',
     'Спроєктував стіл, ставки та мультиплеєрні потоки для iOS та Android.'],
  ],
  nftisls: [
    ['Picked up the project from the previous designer and stabilised the design system.',
     'Прийняв проєкт від попереднього дизайнера і стабілізував дизайн-систему.'],
    ['Maintained the UI component library and delivered new screens and features.',
     'Підтримував бібліотеку UI-компонентів і здавав нові екрани та функції.'],
  ],
  room8p: [
    ['Designed seasonal event pop-ups for browser & mobile casual / gambling titles.',
     'Спроєктував сезонні івентові попапи для браузерних і мобільних казуальних / гемблінг-ігор.'],
    ['Turned the client UX designer’s wireframes and mockups into polished, on-brand final screens.',
     'Перетворював вайрфрейми і мокапи UX-дизайнера клієнта на заполішені фінальні екрани в стилі бренду.'],
    ['Worked in a cartoon art style with rapid iteration cycles across multiple holidays.',
     'Працював у мультяшному стилі з короткими ітераціями під різні свята.'],
  ],
  funrun: [
    ['Designed the full casual-game UI: main hub, character roster, shop and progression.',
     'Спроєктував повний UI казуальної гри: головний хаб, ростер персонажів, магазин і прогресію.'],
    ['Created mini-game screens, match-start and win/result flows with lively animation cues.',
     'Створив екрани міні-ігор, старту матчу та перемоги/результату з жвавими анімаційними підказками.'],
    ['Established a bright, character-driven cartoon art direction across every screen.',
     'Задав яскравий мультяшний арт-дірекшн з персонажами на кожному екрані.'],
  ],
  sweep: [
    ['Designed the entire platform end-to-end using AI tools — from prompt-driven concepts to a polished, dark hi-fi design system.',
     'Спроєктував усю платформу від початку до кінця за допомогою AI-інструментів — від концептів за промптами до заполішеної темної hi-fi дизайн-системи.'],
    ['Delivered the full player product: lobby, game hub, wallet (Gold & Sweep Coins), lucky wheel, promotions and account settings.',
     'Зробив повний продукт для гравця: лобі, ігровий хаб, гаманець (Gold і Sweep Coins), колесо фортуни, промо та налаштування акаунту.'],
    ['Designed the internal admin & analytics dashboard — deposits, withdrawals, players and RBAC — alongside the player UI.',
     'Спроєктував внутрішню адмін- та аналітичну панель — депозити, виводи, гравці та RBAC — поряд із клієнтським UI.'],
    ['Iterated through many client-reviewed variants and shipped responsive desktop + mobile layouts on a reusable token system.',
     'Пройшов багато варіантів на рев’ю клієнта та здав адаптивні десктоп- і мобільні макети на переюзабельній системі токенів.'],
  ],
  domblk: [
    ['Designed the full real-money game flow: practice, head-to-head cash matches, play-with-friends and tournament brackets.',
     'Спроєктував увесь флоу гри на реальні гроші: практика, матчі один-на-один на гроші, гра з друзями та турнірні сітки.'],
    ['Built the live game-board UI — tiles, scores, boneyard, turn timers and in-game video chat.',
     'Зробив UI ігрового столу — кістки, рахунок, базар, таймери ходу та відеочат у грі.'],
    ['Designed profile, ranks & stats and the wallet — balance, withdrawals and full transaction history.',
     'Спроєктував профіль, ранги й статистику та гаманець — баланс, виведення і повну історію транзакцій.'],
    ['Set a dark, neon art direction: wireframes → style concepts → moodboards → polished final screens.',
     'Задав темний неоновий арт-дірекшн: вайрфрейми → концепти стилю → мудборди → фінальні заполішені екрани.'],
  ],
  nugget: [
    ['Designed the full mining-themed slot UI: main game, multi-reel bonus game with a Grand/Major/Minor/Mini jackpot ladder, transition and win screens, and all popups (Congratulations, Total Win, Buy Money Respin).',
     'Розробив повний UI слота в шахтарській тематиці: головна гра, бонус-гра з кількома барабанами та драбиною джекпотів Grand/Major/Minor/Mini, екрани переходу й виграшу та всі попапи (Congratulations, Total Win, Buy Money Respin).'],
    ['Crafted the game’s visual language and assets — timber-and-brass reel frames, prospector character, chains, lanterns, gold nuggets, letter/high symbols, tiles and the logo.',
     'Створив візуальну мову та ассети гри — дерев’яно-латунні рамки барабанів, персонажа-старателя, ланцюги, ліхтарі, золоті самородки, символи-літери й high-символи, плитки та логотип.'],
    ['Assembled a developer-ready Figma UI kit for the Unity team: layered screens, live Rye/Montserrat text, a toggleable tournament-panel component and annotation cards documenting each asset’s size, color, font and effects.',
     'Зібрав готовий для розробників Figma UI-kit для Unity-команди: шаруваті екрани, живий текст Rye/Montserrat, перемикабельний компонент турнірної панелі та картки-анотації з розміром, кольором, шрифтом та ефектами кожного ассета.'],
  ],
  thinks: [
    ['Designed multiple complete landing-page concept directions (Dark Ops, Minimal, Ops Command), each with its own palette, typography and tone against the brand brief.',
     'Розробив кілька повних напрямків лендінгу (Dark Ops, Minimal, Ops Command), кожен зі своєю палітрою, типографікою і тоном за брифом бренду.'],
    ['Created a set of polished dark-mode feature illustrations — agent-topology graph, live activity feed and before/after “runs vs. waits” panels — as the page’s key visuals.',
     'Створив набір відшліфованих темних ілюстрацій фіч — граф топології агентів, стрічку живої активності та панелі “до/після” — як ключові візуали сторінки.'],
    ['Built a dark-theme design system (color, type scale, spacing, motion) and authored the concepts as browsable HTML/CSS with animated SVG, front-end via Claude Code.',
     'Побудував темну дизайн-систему (колір, типографіка, відступи, анімація) та зверстав концепції як HTML/CSS з анімованим SVG, фронтенд — через Claude Code.'],
  ],
  trademule: [
    ['Designed the V2 concept in Figma and translated it into six-plus hand-coded HTML/CSS landing directions — from a premium dark hero with an iPhone signal panel to a light layout with floating alert cards and a live market ticker.',
     'Розробив концепцію V2 у Figma і втілив її у шість+ власноруч зверстаних HTML/CSS-напрямків лендінгу — від преміального темного героя з панеллю сигналів на iPhone до світлого макета з плаваючими картками сповіщень і живою біржовою стрічкою.'],
    ['Implemented the chosen design into WordPress/Elementor with ~45KB of custom responsive CSS — pixel-tuned desktop, tablet and mobile layouts and a full-screen mobile menu.',
     'Впровадив обраний дизайн у WordPress/Elementor з ~45КБ адаптивного CSS — вивірені макети для десктопа, планшета й мобільного та повноекранне мобільне меню.'],
    ['Built custom HTML/JS form widgets for the sign-up flow — OTP phone verification, plan selector, trust badges and an embedded Stripe checkout — beyond default page-builder components.',
     'Створив кастомні HTML/JS-віджети форм для реєстрації — OTP-верифікацію телефону, вибір плану, бейджі довіри та вбудований Stripe-чекаут — поза межами стандартних компонентів конструктора.'],
  ],
  simgate: [
    ['Designed the full product in Figma: the end-to-end UX flow across the projects workspace, empty-state onboarding, the learning-brief form and the generated-brief view.',
     'Спроєктував увесь продукт у Figma: наскрізний UX-флоу — робочий простір, онбординг у порожньому стані, форма брифу та перегляд згенерованого брифу.'],
    ['Built a cohesive design system with a token-driven two-theme setup — a light “Figma-blue” theme and a dark “ops-console” theme — plus color, type, radius and shadow scales.',
     'Побудував цілісну дизайн-систему на токенах із двома темами — світлою “Figma-blue” і темною “ops-console” — та шкали кольору, типографіки, радіусів і тіней.'],
    ['Designed the three-pane brief editor (sources panel, central document, AI refine chat) and drove the front-end implementation as a React prototype.',
     'Спроєктував трипанельний редактор брифу (панель джерел, центральний документ, AI-чат доопрацювання) і супроводжував front-end реалізацію у вигляді React-прототипу.'],
  ],
};

// Store presence & metrics — real, verified figures only (researched
// from live store pages). A project with no verified data = no panel.
const PROJECT_STATS = {
  undead: {
    stores: [
      { platform: 'Steam', url: 'https://store.steampowered.com/app/2664670/Undeads/', rating: '69%', reviews: '145' },
    ],
    highlights: [
      ['Free-to-play · released on Steam, Dec 2025', 'Free-to-play · реліз у Steam, груд. 2025'],
    ],
  },
  jelly: {
    stores: [
      { platform: 'App Store', url: 'https://apps.apple.com/us/app/jellyvale-a-match-tale/id6448806874', rating: '4.9', reviews: '1.1K' },
      { platform: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.squidgames.jellyvale', downloads: '10K+', rating: '4.7', reviews: '270' },
    ],
  },
  meegos: {
    stores: [
      { platform: 'App Store', url: 'https://apps.apple.com/us/app/meegos-mayhem/id6739812777', rating: '5.0', reviews: '7' },
      { platform: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.BlocksmithLabs.MeegosMayhem', downloads: '500+' },
    ],
  },
  tantra: {
    stores: [
      { platform: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.vsf.tantrasadhana', downloads: '100K+', rating: '5.0', reviews: '1.2K' },
      { platform: 'App Store', url: 'https://apps.apple.com/us/app/tantra-sadhana/id6503433847', rating: '5.0', reviews: '344' },
    ],
  },
  evio: {
    stores: [
      { platform: 'CrazyGames', url: 'https://www.crazygames.com/game/ev-io', rating: '4.3' },
    ],
    highlights: [
      ['400K+ registered players', '400K+ зареєстрованих гравців'],
      ['Peaked at 1M+ monthly visits (2022)', 'Пік — 1M+ візитів на місяць (2022)'],
    ],
  },
};

// Platform / engine → icon files
function getPlatformIcons(platform, engine) {
  const icons = [];
  const P = '/assets/icons/platforms/';
  if (platform) {
    const p = platform.toLowerCase();
    if (p.includes('ios'))     icons.push([P + 'ios.svg', 'iOS']);
    if (p.includes('android')) icons.push([P + 'android.svg', 'Android']);
    if (p.includes('desktop')) icons.push([P + 'desktop.svg', 'Desktop']);
    if (p.includes('browser')) icons.push([P + 'browser.svg', 'Browser']);
    if (p.includes('web') && !p.includes('browser')) icons.push([P + 'web.svg', 'Web']);
    if (p.includes('mobile'))  icons.push([P + 'mobile.svg', 'Mobile']);
    if (p.includes('steam'))   icons.push([P + 'steam.svg', 'Steam']);
  }
  if (engine && engine.toLowerCase() === 'unity') {
    icons.push(['/assets/icons/engines/unity.svg', 'Unity']);
  }
  return icons;
}

// Icon chips (22×22 contrast chips — rule 5)
function buildIconChips(platform, engine) {
  return getPlatformIcons(platform, engine)
    .map(([src, alt]) => `<span class="pc-chip" title="${alt}"><img src="${src}" alt="${alt}"></span>`)
    .join('');
}

// Plain icon imgs (used by project.html)
function buildIconImgs(platform, engine, cls = 'pc-icon') {
  return getPlatformIcons(platform, engine)
    .map(([src, alt]) => `<img class="${cls}" src="${src}" alt="${alt}" title="${alt}">`)
    .join('');
}

// ─────────────────────────────────────────
//  I18N
// ─────────────────────────────────────────
const MONTHS_EN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_UA = ['','Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];

const getLang = () => document.documentElement.getAttribute('data-lang') || 'en';
const t = arr  => Array.isArray(arr) ? arr[getLang() === 'ua' ? 1 : 0] : (arr || '');

function fmtDate(d, lang) {
  // "Present" only for entries that literally reference the NOW sentinel —
  // a fixed end date equal to NOW's month must still print as a date.
  if (d === NOW) return lang === 'ua' ? 'Зараз' : 'Present';
  const [y, m] = d;
  return (lang === 'ua' ? MONTHS_UA : MONTHS_EN)[m] + ' ' + y;
}

function fmtDuration(s, e) {
  const months = monthsIn(s, e);
  const y = Math.floor(months / 12);
  const m = months % 12;
  const lang = getLang();
  const parts = [];
  if (lang === 'ua') {
    if (y) parts.push(y + ' р.');
    if (m) parts.push(m + ' м.');
  } else {
    if (y) parts.push(y + (y === 1 ? ' yr' : ' yrs'));
    if (m) parts.push(m + ' mo');
  }
  return parts.join(' ') || (lang === 'ua' ? '< 1 м.' : '< 1 mo');
}

// ─────────────────────────────────────────
//  DATA — COMPANIES
// ─────────────────────────────────────────
const COMPANIES = [
  {
    id: 'tatem',
    name: 'Tatem Games',
    role: ['Game UI/UX Designer', 'Game UI/UX дизайнер'],
    color: '#2dd4bf', bg: 'rgba(45,212,191,0.06)', border: 'rgba(45,212,191,0.20)',
    side: 'left', s: [2026, 5], e: [2026, 9],
    url: 'https://tatem.games/',
  },
  {
    id: 'whimsy',
    name: 'Whimsy Games',
    role: ['Product Game UI/UX Designer', 'Продуктовий Game UI/UX дизайнер'],
    color: '#818cf8', bg: 'rgba(99,102,241,0.07)', border: 'rgba(129,140,248,0.22)',
    side: 'right', s: [2024, 9], e: NOW,
    url: 'https://whimsygames.co',
  },
  {
    id: 'argentics',
    name: 'Argentics',
    role: ['Product Game UI/UX Designer', 'Продуктовий Game UI/UX дизайнер'],
    color: '#38bdf8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.20)',
    side: 'left', s: [2025, 2], e: [2025, 11],
    url: 'https://argentics.io',
  },
  {
    id: 'fg',
    name: 'FG Factory',
    role: ['Game UI/UX Designer', 'Game UI/UX дизайнер'],
    color: '#fb923c', bg: 'rgba(251,146,60,0.07)', border: 'rgba(251,146,60,0.22)',
    side: 'right', s: [2022, 6], e: [2024, 9],
    url: 'https://fgfactory.com',
  },
  {
    id: 'room8',
    name: 'Room 8 Studio',
    role: ['Game UI/UX Designer', 'Game UI/UX дизайнер'],
    color: '#34d399', bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.22)',
    side: 'right', s: [2022, 2], e: [2022, 6],
    url: 'https://room8studio.com',
  },
  {
    id: 'freelance',
    name: ['Freelance', 'Фріланс'],
    role: ['UI/UX & Graphic Designer', 'UI/UX та графічний дизайнер'],
    color: '#64748b', bg: 'rgba(71,85,105,0.04)', border: 'rgba(71,85,105,0.14)',
    side: 'left', s: [2016, 1], e: NOW,
    url: 'https://www.behance.net/vossapov',
    ambient: true,   // no cards; stripes; extends to container bottom
  },
];

// ─────────────────────────────────────────
//  DATA — PROJECTS
// ─────────────────────────────────────────
const PROJECTS = [
  /* BEHANCE:projects */
  {
    id: 'audiostore', co: 'freelance', s: [2017, 9], e: [2017, 10],
    name:    ["Audiostore Banners", "Банери Audiostore"],
    genre:   ["Web banners / display advertising", "Веб-банери / медійна реклама"],
    platform: 'Web', engine: null,
    desc: [
      "A web display banner pack for an online audio store, presented on a dark textured cover with an orange accent and outlined type.",
      "Пакет веб-банерів для онлайн-аудіомагазину, представлений на темній фактурній обкладинці з помаранчевим акцентом і контурним шрифтом.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/58228729/audiostore-banners-pack" }],
  },
  {
    id: 'soundmag', co: 'freelance', s: [2017, 9], e: [2017, 10],
    name:    ["Soundmag", "Soundmag"],
    genre:   ["Brand identity — audio retail", "Фірмовий стиль — аудіоритейл"],
    platform: 'Branding', engine: null,
    desc: [
      "Brand identity for Soundmag, a personal-audio store and showroom operating in Dnipro and Kyiv. The system covers a wordmark with the tagline \"Trust your ears,\" a black-orange-red palette, PT Sans typography, and a full run of applications: business cards, gift box, stickers, gift certificate, brochure, website, outdoor citylight ads, and a Christmas seasonal set.",
      "Фірмовий стиль для Soundmag — салону персонального аудіо в Дніпрі та Києві. Система охоплює логотип зі слоганом «Вір своїм ушам», палітру з чорного, помаранчевого й червоного, шрифт PT Sans та повний набір застосувань: візитки, подарункову коробку, наліпки, подарунковий сертифікат, брошуру, сайт, зовнішню рекламу-сітілайт і різдвяний сезонний набір.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/57555643/Branding-Soundmag" }],
  },
  {
    id: 'mykolaivid', co: 'freelance', s: [2018, 7], e: [2018, 8],
    name:    ["Mykolaiv ID Card", "Картка миколаївця"],
    genre:   ["Civic identity / branding concept", "Міська ідентика / брендинг-концепт"],
    platform: 'Branding', engine: null,
    desc: [
      "A civic identity concept for a Mykolaiv resident card that combines a Visa payment card, a municipal travel card, and a personal ID card in one document.",
      "Концепт міської ідентики для картки миколаївця, що поєднує платіжну картку Visa, проїзний на міський транспорт і персональне посвідчення в одному документі.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/68766631/" }],
  },
  {
    id: 'boomerang', co: 'freelance', s: [2018, 11], e: [2018, 12],
    name:    ["Boomerang", "Boomerang"],
    genre:   ["Brand Identity", "Фірмовий стиль"],
    platform: 'Branding', engine: null,
    desc: [
      "Brand identity for Boomerang Store, an online sport shoes and wear outlet. The system spans a chevron logo, a red/black/white palette, web and mobile store interfaces, ad banners and a social page.",
      "Фірмовий стиль для Boomerang Store, інтернет-магазину спортивного взуття та одягу. Система охоплює логотип-шеврон, палітру червоного, чорного та білого, інтерфейси веб- і мобільної версій, рекламні банери та сторінку в соцмережі.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/69875485/Branding-Boomerang" }],
  },
  {
    id: 'woxs', co: 'freelance', s: [2019, 3], e: [2019, 4],
    name:    ["WOXS", "WOXS"],
    genre:   ["Brand Identity", "Фірмовий стиль"],
    platform: 'Branding', engine: null,
    desc: [
      "Brand identity and website design for WOXS production, a digital agency. Includes an X-mark logo, Proxima Nova type, a blue/red/white palette, and full website mockups for the homepage, service pages, and package landings.",
      "Фірмовий стиль та дизайн сайту для діджитал-агенції WOXS production. Логотип у формі літери X, шрифт Proxima Nova, синьо-червоно-біла палітра та повні макети головної сторінки, сторінок послуг і лендингів пакетів.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/79126707/Branding-WOXS" }],
  },
  {
    id: 'voznesenskcity', co: 'freelance', s: [2020, 8], e: [2020, 9],
    name:    ["Voznesensk City Branding", "Бренд міста Вознесенськ"],
    genre:   ["City / place branding", "Брендинг міста"],
    platform: 'Branding', engine: null,
    desc: [
      "Competition concept for a unified city brand for Voznesensk: a bird-in-shield coat-of-arms mark, wordmark, floral border pattern, icon set, colour palette and mockups.",
      "Конкурсна концепція єдиного бренду Вознесенська: герб із птахом у щиті, логотип, квітковий бордюрний патерн, набір іконок, палітра та мокапи.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/104717597/" }],
  },
  {
    id: 'cargotracker', co: 'freelance', s: [2020, 9], e: [2020, 10],
    name:    ["Cargo Tracker", "Cargo Tracker"],
    genre:   ["Mobile app UI", "UI мобільного застосунку"],
    platform: 'Mobile', engine: null,
    desc: [
      "Cargo Tracker is a prototype mobile app for tracking freight shipments, with screens for shipment details, delivery status, driver profiles, live map location, and order history.",
      "Cargo Tracker — прототип мобільного застосунку для відстеження вантажних відправлень, з екранами деталей відправлення, статусу доставки, профілів водіїв, карти та історії замовлень.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/106490831/Cargo-Tracker-mobile-app" }],
  },
  {
    id: 'routeschemes', co: 'freelance', s: [2020, 9], e: [2020, 10],
    name:    ["Mykolaiv Transit Maps", "Схеми транспорту Миколаєва"],
    genre:   ["Transit wayfinding and information design", "Транспортна навігація та інформаційний дизайн"],
    platform: 'Print', engine: null,
    desc: [
      "A self-initiated redesign of public-transport route schemes for the Ukrainian port city of Mykolaiv, taken from an early crowd-reviewed alpha map to a full electric-transport scheme system with formats, mockups, dark and white modes.",
      "Ініціативний редизайн схем маршрутів громадського транспорту Миколаєва — від ранньої альфа-версії карти, яку обговорювали користувачі, до цілісної системи схем електротранспорту з форматами, мокапами, темним і світлим режимами.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/106204651/" }],
  },
  {
    id: 'anthracite', co: 'freelance', s: [2021, 11], e: [2021, 12],
    name:    ["Anthracite Coffee", "Anthracite"],
    genre:   ["Brand identity / Coffee shop", "Фірмовий стиль / Кав'ярня"],
    platform: 'Branding', engine: null,
    desc: [
      "Brand identity for Anthracite, a coffee shop in Kyiv, built on a one-line script logo, an anthracite-grey palette, and continuous line-art illustration applied across packaging, apparel, signage, and social media.",
      "Фірмовий стиль для Anthracite, кав'ярні в Києві: рукописний однолінійний логотип, антрацитово-сіра палітра та безперервна лінійна ілюстрація на упаковці, одязі, вивісках і в соцмережах.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/132397781/Anthracite-Coffee-Shop-Branding" }],
  },
  {
    id: 'voskresensk', co: 'freelance', s: [2021, 11], e: [2021, 12],
    name:    ["Voskresensk Territory Branding", "Воскресенська громада"],
    genre:   ["Territory / place branding", "Брендинг території"],
    platform: 'Branding', engine: null,
    desc: [
      "Territory branding for the Voskresensk united territorial community: a circular people-and-sun mark, a navy-and-orange palette drawn from local embroidery, an organic blob pattern, and a full run of merch, signage and vehicle applications.",
      "Брендинг території Воскресенської громади: колова емблема з фігурок людей навколо сонця, темно-синьо-помаранчева палітра з місцевої вишивки, органічний патерн із «крапель» та повний набір мерчу, навігації й транспорту.",
    ],
    links: [{ label: 'behance.net', url: "https://www.behance.net/gallery/132403433/Voskresensk-Territory-branding" }],
  },

  // ── Tatem Games ──────────────────────────────────────────────
  {
    id: 'blastjam', co: 'tatem', s: [2026, 7], e: [2026, 9],
    name:    ['Blast Jam 3D', 'Blast Jam 3D'],
    genre:   ['3D Block-Blast Puzzle', '3D block-blast головоломка'],
    platform: 'Mobile', engine: null,
    desc: [
      'Casual 3D block-blast puzzle for portrait mobile, live with ads at Tatem Games. UI for the home screen, gameplay HUD, boosters and reward popups.',
      'Казуальна 3D-головоломка block-blast для мобільних у портретній орієнтації, лайв-гра з рекламою у Tatem Games. UI головного екрана, ігрового HUD, бустерів і попапів нагород.',
    ],
    links: [],
  },
  {
    id: 'tilesort', co: 'tatem', s: [2026, 5], e: [2026, 7],
    name:    ['Magic Tiles Sort', 'Magic Tiles Sort'],
    genre:   ['Color-Sort Puzzle', 'Пазл-сортування кольорів'],
    platform: 'Mobile', engine: null,
    desc: [
      'A cozy mobile puzzle where the player sorts colored tiles into full stacks in a cat-room setting. I designed the UI across the whole loop — home, gameplay, win flow, shop, offers and settings.',
      'Затишна мобільна головоломка, де гравець розкладає кольорові плитки в повні стоси в котячій кімнаті. Я спроєктував UI для всього циклу — головний екран, геймплей, екран перемоги, магазин, офери та налаштування.',
    ],
    links: [],
  },

  {
    id: 'tadafish', co: 'whimsy', s: [2026, 2], e: [2026, 4],
    name:    ['Tada Fish', 'Tada Fish'],
    genre:   ['Arcade Fish Shooter', 'Аркадний fish-шутер'],
    platform: 'Mobile', engine: null,
    desc: [
      'Underwater fish-shooter arcade with Major, Grand and Minor jackpots on landscape mobile. I designed the in-game windows: the auto-fishing popup and the four-tab info system.',
      'Підводна аркада-шутер по рибах із джекпотами Major, Grand і Minor для мобільних у ландшафті. Спроєктував ігрові вікна: попап авторибалки та інфо-систему з чотирьох вкладок.',
    ],
    links: [],
  },

  // ── Whimsy Games ─────────────────────────────────────────────
  {
    id: 'undead', co: 'whimsy', s: [2024, 9], e: [2026, 6],
    name:    ['Undead', 'Undead'],
    genre:   ['Survival Shooter', 'Survival шутер'],
    platform: 'Desktop', engine: 'Unity',
    desc: [
      'Led UI/UX after designer handoff. Scope: feature docs & research, wireframes, multi-resolution adaptation (1080p–4K), Steam Deck & gamepad layouts, 16-language localization, full Figma design system.',
      'UI/UX після хендофу. Документація, ресерч, макети. Адаптація під роздільності (1080p–4K), Steam Deck / геймпад, локалізація 16 мовами, дизайн-система у Figma.',
    ],
    links: [{ label: 'Steam', url: 'https://store.steampowered.com/app/2664670/Undeads/' }],
  },
  {
    id: 'jelly', co: 'whimsy', s: [2024, 9], e: [2026, 1],
    name:    ['Jelly Valley', 'Jelly Valley'],
    genre:   ['Match-3 + City Builder', 'Match-3 + Сіті-білдер'],
    platform: 'iOS / Android', engine: 'Unity',
    desc: [
      'First UI/UX designer on the project. Migrated Photoshop assets to Figma, built a scalable design system from scratch, shipped new features and live-ops mechanics.',
      'Перший UI/UX дизайнер. Перенесення Photoshop → Figma, дизайн-система з нуля, нові фічі та live-ops механіки.',
    ],
    links: [],
  },
  {
    id: 'meegos', co: 'whimsy', s: [2025, 6], e: [2025, 10],
    name:    ['Meegos Mayhem', 'Meegos Mayhem'],
    genre:   ['Casual Runner', 'Казуальний ранер'],
    platform: 'iOS / Android', engine: 'Unity',
    desc: [
      'Full visual redesign, character customisation system, monetisation shop, rank & leaderboard UI.',
      'Повний редизайн стилю, система кастомізації персонажів, магазин монетизації, система рангів.',
    ],
    links: [{ label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.BlocksmithLabs.MeegosMayhem' }],
  },
  {
    id: 'sweep', co: 'whimsy', s: [2025, 12], e: [2026, 6],
    name:    ['Sweepstake', 'Sweepstake'],
    genre:   ['Social Casino Platform', 'Соціальна казино-платформа'],
    platform: 'Web', engine: null,
    desc: [
      'Social sweepstakes casino platform, designed end-to-end entirely with AI tools. Owned the full player product — lobby, game hub, wallet (Gold & Sweep Coins), lucky wheel, promotions and account — plus the internal admin & analytics panel, across many client-reviewed variants: from a dark hi-fi design system through responsive desktop + mobile handoff.',
      'Платформа соціального свіпстейк-казино, дизайн повністю створений за допомогою AI-інструментів. Відповідав за весь продукт для гравця — лобі, ігровий хаб, гаманець (Gold і Sweep Coins), колесо фортуни, промо й акаунт — та внутрішню адмін- і аналітичну панель, у багатьох варіантах на рев’ю клієнта: від темної hi-fi дизайн-системи до адаптивного десктоп- і мобільного хендофу.',
    ],
    links: [],
  },
  {
    id: 'nugget', co: 'whimsy', s: [2026, 5], e: [2026, 7],
    name:    ['Nugget Nutter', 'Nugget Nutter'],
    genre:   ['Slot Game UI', 'UI слот-гри'],
    platform: 'Mobile', engine: 'Unity',
    desc: [
      'Gold-rush, mining-themed slot game for Whimsy Games (portrait mobile). Designed the full game UI — main game, multi-reel bonus game with a Grand/Major/Minor/Mini jackpot ladder, transition and win screens and all popups — plus a developer-ready Figma UI kit for the Unity team.',
      'Слот у тематиці золотої лихоманки для Whimsy Games (вертикальний мобільний). Спроєктував повний ігровий UI — головна гра, бонус-гра з кількома барабанами та драбиною джекпотів Grand/Major/Minor/Mini, екрани переходу й виграшу та всі попапи — і готовий для розробників Figma UI-kit для Unity-команди.',
    ],
    links: [],
  },

  // ── Argentics ────────────────────────────────────────────────
  {
    id: 'gunbit', co: 'argentics', s: [2025, 2], e: [2025, 11],
    name:    ['Gunbit', 'Gunbit'],
    genre:   ['Multiplayer Shooter', 'Мультиплеєрний шутер'],
    platform: 'Mobile', engine: 'Unity',
    desc: [
      'Full UX cycle: consulting → screen flows → wireframes → prototypes → art direction → moodboards → VFX references → developer handoff.',
      'Повний UX-цикл: консалтинг → screenflow → вайрфрейми → прототипи → арт-дірекшн → мудборди → VFX → передача в розробку.',
    ],
    links: [],
  },

  // ── FG Factory ───────────────────────────────────────────────
  {
    id: 'winday', co: 'fg', s: [2023, 9], e: [2024, 9],
    name:    ['Win Day', 'Win Day'],
    genre:   ['Gamification SaaS', 'Геймфікаційний SaaS'],
    platform: 'Web', engine: null,
    desc: [
      'In-house B2B SaaS — no-code constructor for branded gamified marketing campaigns. Designed client panel, admin panel, and customisable game UI components from deep UX research through final handoff.',
      'Власний B2B SaaS. No-code конструктор гейміфікованих маркетингових кампаній. Панель клієнта + адмін + ігровий UI. Від UX-ресерчу до фінального хендофу.',
    ],
    links: [{ label: 'winday.co', url: 'https://winday.co' }],
  },
  {
    id: 'casino24', co: 'fg', s: [2024, 3], e: [2024, 5],
    name:    ['Casino Domino', 'Casino Domino'],
    genre:   ['Casino / Multiplayer', 'Казино / Мультиплеєр'],
    platform: 'Mobile', engine: null,
    desc: [
      'Multiplayer domino with real-time video chat. Full UI pipeline: wireframes → style concept → final screens.',
      'Мультиплеєрне доміно з відеочатом. Повний UI-цикл: вайрфрейми → концепт → фінальні екрани.',
    ],
    links: [{ label: 'casinodominoes.com', url: 'https://casinodominoes.com/' }],
  },
  {
    id: 'tantra', co: 'fg', s: [2023, 5], e: [2023, 9],
    name:    ['Tantra Sadhana', 'Tantra Sadhana'],
    genre:   ['Adventure RPG', 'Пригодницька RPG'],
    platform: 'iOS / Android', engine: 'Unity',
    desc: [
      'Wireframes → visual style exploration → interactive prototypes → all UI screens.',
      'Вайрфрейми → дослідження стилю → прототипи → всі UI-екрани.',
    ],
    links: [{ label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.vsf.tantrasadhana' }],
  },
  {
    id: 'racer', co: 'fg', s: [2023, 3], e: [2023, 5],
    name:    ['Racer Club', 'Racer Club'],
    genre:   ['NFT Kart Racing', 'NFT Kart рейсинг'],
    platform: 'Desktop', engine: 'Unity',
    desc: [
      'UI/UX from scratch: wireframes → game UI → HUD → all screens. NFT integration.',
      'UI/UX з нуля: вайрфрейми → ігровий UI → HUD → всі екрани. NFT-інтеграція.',
    ],
    links: [{ label: 'Case Study', url: 'https://fgfactory.com/work/racer-club' }],
  },
  {
    id: 'evio', co: 'fg', s: [2023, 1], e: [2023, 3],
    name:    ['ev.io', 'ev.io'],
    genre:   ['Browser FPS', 'Браузерний FPS'],
    platform: 'Browser', engine: null,
    desc: [
      'Complete UI redesign of a live multiplayer browser FPS with blockchain/NFT integration.',
      'Повний UI-редизайн мультиплеєрного браузерного FPS з блокчейн/NFT-інтеграцією.',
    ],
    links: [{ label: 'ev.io', url: 'https://ev.io' }],
  },
  {
    id: 'funrun', co: 'fg', s: [2023, 1], e: [2023, 6],
    name:    ['Fun Run', 'Fun Run'],
    genre:   ['Casual Party Game', 'Казуальна паті-гра'],
    platform: 'iOS / Android', engine: 'Unity',
    desc: [
      'Bright, character-driven casual game: designed the main hub, character roster, shop, mini-games and win/result flows with a playful cartoon art direction.',
      'Яскрава казуальна гра з персонажами: спроєктував головний хаб, ростер персонажів, магазин, міні-ігри та екрани перемоги/результату в мультяшній стилістиці.',
    ],
    links: [],
  },
  {
    id: 'domblk', co: 'fg', s: [2022, 9], e: [2023, 1],
    name:    ['Dominoes for Cash', 'Dominoes for Cash'],
    genre:   ['Real-Money Dominoes', 'Доміно на гроші'],
    platform: 'iOS / Android', engine: null,
    desc: [
      'Real-money skill dominoes for mobile. Designed the full product UI — practice, head-to-head cash matches, play-with-friends, tournament brackets and in-game video chat — plus profile, ranks, wallet and transactions. Wireframes → style concepts → moodboards → final screens.',
      'Скіл-доміно на реальні гроші для мобільних. Спроєктував увесь UI продукту — практика, матчі один-на-один на гроші, гра з друзями, турнірні сітки та відеочат у грі — плюс профіль, ранги, гаманець і транзакції. Вайрфрейми → концепти стилю → мудборди → фінальні екрани.',
    ],
    links: [],
  },
  {
    id: 'nftisls', co: 'fg', s: [2022, 6], e: [2022, 9],
    name:    ['NFT Islands', 'NFT Islands'],
    genre:   ['Blockchain Game', 'Блокчейн гра'],
    platform: 'Mobile', engine: null,
    desc: [
      'Picked up from previous designer. Design system maintenance, new screens, UI component library.',
      'Прийняв від іншого дизайнера. Підтримка дизайн-системи, нові екрани та UI-компоненти.',
    ],
    links: [{ label: 'Case Study', url: 'https://fgfactory.com/work/nft-islands' }],
  },

  // ── Room 8 Studio ────────────────────────────────────────────
  {
    id: 'room8p', co: 'room8', s: [2022, 2], e: [2022, 6],
    name:    ['Client Projects (NDA)', 'Клієнтські проєкти (NDA)'],
    genre:   ['Seasonal Event UI', 'Сезонний івентовий UI'],
    platform: 'Browser / Mobile', engine: null,
    desc: [
      'Seasonal event pop-ups for browser & mobile casual/gambling titles. Cartoon art style, rapid iteration cycles.',
      'Сезонні івентові попапи для браузерних і мобільних ігор. Мультяшний стиль, короткі ітерації.',
    ],
    links: [],
  },

  // ── Freelance (with Hanna) ───────────────────────────────────
  {
    id: 'thinks', co: 'freelance', s: [2026, 3], e: [2026, 4],
    name:    ['THINKS', 'THINKS'],
    genre:   ['SaaS Landing · Brand', 'Лендінг SaaS · Бренд'],
    platform: 'Web', engine: null,
    desc: [
      'Managed AI-operations platform — a command centre where AI agents run a business across every client and timezone ("your operation runs, you sleep"). Freelance, with Hanna: designed the marketing site — several complete landing concepts (Dark Ops, Minimal, Ops Command), dark-mode feature illustrations and a dark design system — built as browsable HTML/CSS.',
      'Керована платформа AI-операцій — командний центр, де AI-агенти ведуть бізнес по всіх клієнтах і часових поясах («твоя операція працює — ти спиш»). Фриланс, з Ганною: розробив маркетинговий сайт — кілька повних концептів лендінгу (Dark Ops, Minimal, Ops Command), темні ілюстрації фіч і темну дизайн-систему — зверстані як HTML/CSS.',
    ],
    links: [],
  },
  {
    id: 'trademule', co: 'freelance', s: [2026, 4], e: [2026, 5],
    name:    ['TradeMule', 'TradeMule'],
    genre:   ['Marketing / SaaS Site', 'Маркетинговий / SaaS сайт'],
    platform: 'Web', engine: null,
    desc: [
      'V2 redesign of a real-time futures trade-alerts subscription site (SMS & email signals for NQ/ES/CL/GC). Freelance, with Hanna: designed the concept in Figma, explored six-plus hand-coded HTML/CSS landing directions, and implemented the chosen design into WordPress/Elementor with custom responsive CSS and form widgets.',
      'Редизайн V2 сайту підписки на торгові сигнали ф’ючерсів у реальному часі (SMS/email для NQ/ES/CL/GC). Фриланс, з Ганною: розробив концепцію у Figma, опрацював шість+ власноруч зверстаних HTML/CSS-напрямків лендінгу та впровадив обраний дизайн у WordPress/Elementor з кастомним адаптивним CSS і віджетами форм.',
    ],
    links: [],
  },
  {
    id: 'halfgod', co: 'freelance', s: [2026, 1], e: [2026, 3],
    name:    ['HalfGod', 'HalfGod'],
    genre:   ['Brand Identity', 'Айдентика бренду'],
    platform: 'Branding', engine: null,
    desc: [
      'Brand identity for the HalfGod apparel label: stencil wordmark, star mark, olive-black-off-white palette and a topographic pattern applied across merch and social media.',
      'Айдентика для бренду одягу HalfGod: стенсил-логотип, знак-зірка, палітра олива-чорний-молочний і топографічний патерн на мерчі та в соцмережах.',
    ],
    links: [],
  },
  {
    id: 'myrazom', co: 'freelance', s: [2022, 6], e: [2022, 10],
    name:    ['Mykolaiv United Volunteer HQ', 'Миколаївський об’єднаний волонтерський штаб'],
    genre:   ['Brand Identity', 'Айдентика бренду'],
    platform: 'Branding', engine: null,
    desc: [
      'Identity for the United Volunteer Headquarters of Mykolaiv, created in the wartime summer of 2022 under the «Ми_Разом» brand name: a heart-and-M mark in blue and yellow, category icons and Instagram templates, city outdoor, van livery, print and merch.',
      'Айдентика Об’єднаного волонтерського штабу Миколаєва, створена воєнного літа 2022 під бренд-назвою «Ми_Разом»: знак серце-М у синьо-жовтому, іконки категорій і шаблони Instagram, зовнішня реклама, брендування авто, друк і мерч.',
    ],
    links: [],
  },
  {
    id: 'voznesensk', co: 'freelance', s: [2023, 3], e: [2023, 6],
    name:    ['Voznesensk Community Foundation', 'Фонд громади Вознесенська'],
    genre:   ['Brand Identity', 'Айдентика бренду'],
    platform: 'Branding', engine: null,
    desc: [
      'Brand identity for the Voznesensk Community Foundation, a local charity founded in 2004. A heart formed by two people, a purple-amber-orange palette, the Lugatype display face, a geometric pattern and an icon set — applied to merch and campaign layouts under the line «Можливості там, де є сміливість діяти».',
      'Айдентика Фонду громади Вознесенська — місцевої благодійної організації, заснованої 2004 року. Серце з двох людей, палітра фіолетовий-бурштиновий-помаранчевий, дисплейна гарнітура Lugatype, геометричний патерн та іконки — на мерчі й кампанійних макетах під гаслом «Можливості там, де є сміливість діяти».',
    ],
    links: [{ label: 'voznesensk-cf.com.ua', url: 'https://voznesensk-cf.com.ua' }],
  },
  {
    id: 'hyperian', co: 'freelance', s: [2023, 3], e: [2023, 6],
    name:    ['Hyperian', 'Hyperian'],
    genre:   ['Home Energy App & Branding', 'Енергозастосунок та айдентика'],
    platform: 'Mobile', engine: null,
    desc: [
      'Brand system and iOS companion app for the Hyperian home battery with rooftop solar. The brand book covers the logo with construction grids, a WCAG-checked light/dark palette and the Metropolis type ramp; the app shows battery charge and live energy flow between panels, home and grid.',
      'Бренд-система та iOS-застосунок для домашньої батареї Hyperian із сонячними панелями. Бренд-бук охоплює лого з сітками побудови, light/dark палітру з перевіркою WCAG і шрифтову шкалу Metropolis; застосунок показує заряд батареї та живий потік енергії між панелями, будинком і мережею.',
    ],
    links: [],
  },
  {
    id: 'montage', co: 'freelance', s: [2022, 9], e: [2022, 11],
    name:    ['Montage', 'Монтаж'],
    genre:   ['Mental Wellness App', 'Wellness-застосунок'],
    platform: 'Mobile', engine: null,
    desc: [
      'A mobile wellness app concept that pairs meditation audio playlists with a gamified habit tracker. Content sits in three categories — chill, connect, charge — with streaks, points and EXP tracked on the profile.',
      'Концепт мобільного wellness-застосунку, що поєднує аудіоплейлисти для медитації з гейміфікованим трекером звичок. Контент поділено на три категорії — chill, connect і charge, а серії, бали та досвід відображаються у профілі.',
    ],
    links: [],
  },
  {
    id: 'onlyriffs', co: 'freelance', s: [2022, 12], e: [2023, 1],
    name:    ['OnlyRiffs', 'OnlyRiffs'],
    genre:   ['Music Creator Platform', 'Платформа для музикантів'],
    platform: 'Web', engine: null,
    desc: [
      'A social platform for musicians where creators post videos, photos and collaborations, and can charge for individual videos. Eight desktop screens cover login, profiles, playlists, upload settings and an admin panel.',
      'Соціальна платформа для музикантів: відео, фото, спільні публікації та платний доступ до окремих роликів. Вісім десктопних екранів — вхід, профілі, плейлисти, налаштування завантаження й адмін-панель.',
    ],
    links: [],
  },
  {
    id: 'simgate', co: 'freelance', s: [2026, 5], e: [2026, 6],
    name:    ['SimGate', 'SimGate'],
    genre:   ['SaaS Web App · EdTech', 'SaaS вебзастосунок · EdTech'],
    platform: 'Web', engine: null,
    desc: [
      'Concept web app for an AI-assisted instructional-design tool: describe a learner and context, attach sources, and an AI Assistant generates a full "Learning Brief" — objectives, curriculum, format. Freelance, with Hanna: designed the product end-to-end in Figma (workspace, three-pane brief editor, onboarding) with a token-driven two-theme design system, implemented as a React prototype.',
      'Концептуальний вебзастосунок AI-інструменту для інструкційного дизайну: опиши слухача й контекст, додай джерела — і AI-асистент генерує повний «Learning Brief» (цілі, програму, формат). Фриланс, з Ганною: спроєктував продукт від початку до кінця у Figma (робочий простір, трипанельний редактор брифу, онбординг) із дизайн-системою на токенах із двома темами, реалізовано як React-прототип.',
    ],
    links: [],
  },
];

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

// ─────────────────────────────────────────
//  FILTER TAXONOMY
//  Visual style per project + derived platform/genre families.
// ─────────────────────────────────────────
const PROJECT_STYLE = {
  /* BEHANCE:style */
  audiostore: 'cleanui',
  soundmag: 'cleanui',
  mykolaivid: 'cleanui',
  boomerang: 'cleanui',
  woxs: 'cleanui',
  voznesenskcity: 'cleanui',
  cargotracker: 'cleanui',
  routeschemes: 'cleanui',
  anthracite: 'cleanui',
  voskresensk: 'cleanui',

  hyperian: 'cleanui',
  montage:  'cleanui',
  onlyriffs: 'cleanui',
  voznesensk: 'cleanui',
  myrazom:  'cleanui',
  halfgod:  'cleanui',
  blastjam: 'cartoon',
  tilesort: 'cartoon',
  tadafish: 'stylized',
  undead:   'realistic',
  jelly:    'cartoon',
  meegos:   'cartoon',
  gunbit:   'stylized',
  winday:   'cleanui',
  casino24: 'stylized',
  tantra:   'stylized',
  racer:    'cartoon',
  evio:     'stylized',
  domblk:   'stylized',
  nftisls:  'cartoon',
  room8p:   'cartoon',
  funrun:   'cartoon',
  sweep:    'stylized',
  nugget:   'realistic',
  thinks:   'cleanui',
  trademule:'cleanui',
  simgate:  'cleanui',
};

const PROJECT_GENRE_FAMILY = {
  /* BEHANCE:family */
  audiostore: 'saas',
  soundmag: 'saas',
  mykolaivid: 'saas',
  boomerang: 'saas',
  woxs: 'saas',
  voznesenskcity: 'saas',
  cargotracker: 'saas',
  routeschemes: 'saas',
  anthracite: 'saas',
  voskresensk: 'saas',

  hyperian: 'saas',
  montage: 'saas',
  onlyriffs: 'saas',
  voznesensk: 'saas',
  myrazom: 'saas',
  halfgod: 'saas',
  blastjam: 'casual', tilesort: 'casual', tadafish: 'casual',
  undead: 'shooter', gunbit: 'shooter', evio: 'shooter',
  jelly: 'casual', meegos: 'casual', room8p: 'casual', funrun: 'casual',
  tantra: 'rpg',
  racer: 'racing',
  casino24: 'tabletop', domblk: 'tabletop', sweep: 'tabletop', nugget: 'tabletop',
  thinks: 'saas', trademule: 'saas', simgate: 'saas',
  nftisls: 'web3',
  winday: 'saas',
};

function platFamilies(p) {
  const s = (p.platform || '').toLowerCase();
  const out = [];
  if (/(ios|android|mobile)/.test(s)) out.push('mobile');
  if (/(desktop|steam|pc)/.test(s))   out.push('desktop');
  if (/(web|browser)/.test(s))        out.push('web');
  return out;
}

const FILTER_DEFS = {
  plat: {
    label: ['Platform', 'Платформа'],
    options: [
      ['all',     'All',     'Всі'],
      ['desktop', 'Desktop', 'Десктоп'],
      ['mobile',  'Mobile',  'Мобайл'],
      ['web',     'Web',     'Веб'],
    ],
  },
  genre: {
    label: ['Genre', 'Жанр'],
    options: [
      ['all',      'All',       'Всі'],
      ['shooter',  'Shooter',   'Шутер'],
      ['casual',   'Casual',    'Казуальні'],
      ['rpg',      'RPG',       'RPG'],
      ['racing',   'Racing',    'Рейсинг'],
      ['tabletop', 'Tabletop',  'Настільні'],
      ['web3',     'Web3',      'Web3'],
      ['saas',     'SaaS',      'SaaS'],
    ],
  },
  style: {
    label: ['Style', 'Стиль'],
    options: [
      ['all',       'All',        'Всі'],
      ['realistic', 'Realistic',  'Реалістичний'],
      ['cartoon',   'Cartoon',    'Мультяшний'],
      ['stylized',  'Stylized',   'Стилізований'],
      ['cleanui',   'Clean UI',   'Чистий UI'],
    ],
  },
};

const viewState = {
  view:   localStorage.getItem('v2-view') || 'timeline',   // timeline | list | tiles
  filters: { plat: 'all', genre: 'all', style: 'all' },
};

function projectMatches(p) {
  const f = viewState.filters;
  if (f.plat  !== 'all' && !platFamilies(p).includes(f.plat)) return false;
  if (f.genre !== 'all' && PROJECT_GENRE_FAMILY[p.id] !== f.genre) return false;
  if (f.style !== 'all' && PROJECT_STYLE[p.id] !== f.style) return false;
  return true;
}

// ─────────────────────────────────────────
//  GEOMETRY — header shift & band edges
//
//  shiftAt(side, ypos): total header offset accumulated above a
//  raw-time position — HEADER_H for every same-side band that
//  ends more recently (strictly smaller yp).  Band tops exclude
//  the band itself (tie), band bottoms include it — one function
//  covers both, and consecutive bands meet exactly.
// ─────────────────────────────────────────
function shiftAt(side, ypos) {
  return HEADER_H * COMPANIES.filter(c => c.side === side && yp(c.e) < ypos).length;
}

const bandTop    = c => yp(c.e) + shiftAt(c.side, yp(c.e));
const bandBottom = c => yp(c.s) + shiftAt(c.side, yp(c.s));
const compShift  = c => shiftAt(c.side, yp(c.e)) + HEADER_H;  // shift applied to c's projects

function totalHeight() {
  const maxBands = Math.max(
    COMPANIES.filter(c => c.side === 'right').length,
    COMPANIES.filter(c => c.side === 'left').length
  );
  return yp(BOTTOM) + HEADER_H * maxBands + PAD_BOTTOM;
}

// ─────────────────────────────────────────
//  COLUMN ASSIGNMENT  (overlap detection, per company)
// ─────────────────────────────────────────
// ─────────────────────────────────────────
//  COMPANY LANES
//  Parallel tracks on one side never share space: employers keep the
//  inner columns by the axis, ambient tracks (freelance / volunteer)
//  each get their own outer rail. Lanes are allocated in whole columns
//  of the G_COLS grid, and every band + its cards stay inside its lane.
// ─────────────────────────────────────────
const spansOverlap = (a, b) => mn(a.s) < mn(b.e) && mn(b.s) < mn(a.e);

function computeLanes() {
  ['left', 'right'].forEach(side => {
    const comps = COMPANIES.filter(c => c.side === side);
    const solid = comps.filter(c => !c.ambient).sort((a, b) => mn(b.e) - mn(a.e));
    const amb   = comps.filter(c => c.ambient);

    // interval-color the employers (overlapping employers → separate lanes)
    const placed = [];
    solid.forEach(c => {
      let l = 0;
      while (placed.some(o => o.lane === l && spansOverlap(c, o.c))) l++;
      placed.push({ c, lane: l });
    });
    const solidLanes = placed.length ? Math.max(...placed.map(o => o.lane)) + 1 : 0;

    // column budget: each ambient rail takes 1 outer column,
    // employers split the remaining inner columns
    const solidCols = Math.max(1, G_COLS - amb.length);
    const per = Math.max(1, Math.floor(solidCols / Math.max(1, solidLanes)));
    placed.forEach(({ c, lane }) => {
      c._c0 = Math.min(lane * per, G_COLS - 1);
      c._c1 = (lane === solidLanes - 1) ? solidCols - 1 : Math.min((lane + 1) * per - 1, solidCols - 1);
    });
    amb.forEach((c, i) => {
      const col = Math.min(solidCols + i, G_COLS - 1);
      c._c0 = col; c._c1 = col;
    });
  });
}

function assignColumns() {
  computeLanes();
  // per company, offset into the company's lane so cards from parallel
  // tracks can never collide (lanes are disjoint by construction)
  const byCompany = {};
  PROJECTS.forEach(p => { (byCompany[p.co] = byCompany[p.co] || []).push(p); });

  Object.entries(byCompany).forEach(([coId, list]) => {
    const comp = COMPANIES.find(c => c.id === coId);
    const c0 = (comp && comp._c0 != null) ? comp._c0 : 0;
    const c1 = (comp && comp._c1 != null) ? comp._c1 : G_COLS - 1;
    list.sort((a, b) => mn(b.e) - mn(a.e));   // most recent first
    list.forEach((p, i) => {
      const taken = new Set(
        list.slice(0, i).filter(o => overlaps(p, o)).map(o => o._col)
      );
      let c = c0;
      while (taken.has(c) && c < c1) c++;
      if (taken.has(c)) console.warn('[tl] lane overflow:', coId, p.id);
      p._col = c;
    });
  });
}

// ─────────────────────────────────────────
//  CARD POSITION  (global equal-width column grid)
//  Per half:  AXIS_CLEAR + 3·colW + 2·COL_GAP + OUTER_PAD = 50%
//  colW  = 50%/3 − (AXIS_CLEAR + OUTER_PAD + 2·COL_GAP)/3
//        = 16.6667% − 29.3333px
//  pos(c) = 50% + AXIS_CLEAR + c·(colW + COL_GAP)
//         = (50 + 16.6667c)% + (40 − 13.3333c)px
// ─────────────────────────────────────────
function cardPos(col, side) {
  const pct = 50 + (50 / G_COLS) * col;
  const px  = AXIS_CLEAR + col * COL_GAP - col * ((AXIS_CLEAR + OUTER_PAD + 2 * COL_GAP) / G_COLS);
  return {
    prop: side === 'right' ? 'left' : 'right',
    pos:  `calc(${pct.toFixed(4)}% + ${px.toFixed(2)}px)`,
    w:    `calc(${(50 / G_COLS).toFixed(4)}% - ${((AXIS_CLEAR + OUTER_PAD + 2 * COL_GAP) / G_COLS).toFixed(2)}px)`,
  };
}

// ─────────────────────────────────────────
//  RENDER — AXIS
// ─────────────────────────────────────────
function renderAxis(root, totalH) {
  const lang = getLang();
  const ax = document.createElement('div');
  ax.className = 'tl-axis';
  ax.innerHTML = `<div class="tl-axis-line"></div>`;

  // NOW marker
  const pulse = document.createElement('div');
  pulse.className = 'ax-pulse';
  pulse.style.top = (PAD_TOP - 6) + 'px';
  ax.appendChild(pulse);

  const nowEl = document.createElement('div');
  nowEl.className = 'ax-now';
  nowEl.textContent = lang === 'ua' ? 'Зараз' : 'Now';
  nowEl.style.top = (PAD_TOP - 42) + 'px';
  ax.appendChild(nowEl);

  // Year pills + month ticks
  for (let y = NOW[0]; y >= BOTTOM[0]; y--) {
    const maxM = (y === NOW[0]) ? NOW[1] : 12;
    const minM = (y === BOTTOM[0]) ? BOTTOM[1] : 1;
    for (let m = maxM; m >= minM; m--) {
      const top = yp([y, m]);
      if (m === 1) {
        const pill = document.createElement('span');
        pill.className = 'ax-ypill';
        pill.textContent = y;
        pill.style.top = top + 'px';
        ax.appendChild(pill);
      } else {
        const dot = document.createElement('div');
        dot.className = 'ax-mdot';
        dot.style.top = top + 'px';
        ax.appendChild(dot);
      }
    }
  }

  root.appendChild(ax);
}

// ─────────────────────────────────────────
//  RENDER — COMPANY BAND (+ header strip)
// ─────────────────────────────────────────
// boundary between column c-1 and column c, measured from the axis side
function laneBoundary(c) {
  const pct = 50 + (50 / G_COLS) * c;
  const px  = AXIS_CLEAR + c * COL_GAP
            - c * ((AXIS_CLEAR + OUTER_PAD + 2 * COL_GAP) / G_COLS)
            - COL_GAP / 2;
  return { pct, px };
}

function renderBand(root, c, totalH) {
  const lang = getLang();
  const top  = bandTop(c);
  const h    = c.ambient ? (totalH - top) : (bandBottom(c) - top);

  const band = document.createElement('div');
  band.className = `tl-band tl-band--${c.side}${c.ambient ? ' tl-band--stripes' : ''}`;
  band.dataset.co = c.id;

  // horizontal extent = the company's lane (whole half when it owns all columns)
  const c0 = (c._c0 != null) ? c._c0 : 0;
  const c1 = (c._c1 != null) ? c._c1 : G_COLS - 1;
  if (c1 - c0 < G_COLS - 1) band.classList.add('tl-band--narrow');
  const inner = c0 === 0 ? { pct: 50, px: 0 } : laneBoundary(c0);
  const outer = c1 === G_COLS - 1 ? { pct: 100, px: 0 } : laneBoundary(c1 + 1);
  const laneCss = c.side === 'right'
    ? `left: calc(${inner.pct.toFixed(4)}% + ${inner.px.toFixed(2)}px); right: auto;`
    : `right: calc(${inner.pct.toFixed(4)}% + ${inner.px.toFixed(2)}px); left: auto;`;
  const laneW = `width: calc(${(outer.pct - inner.pct).toFixed(4)}% + ${(outer.px - inner.px).toFixed(2)}px);`;

  band.style.cssText = `top:${top}px; height:${h}px; --cc:${c.color}; ${laneCss} ${laneW}` +
    (c.ambient
      ? ''
      : ` background: linear-gradient(${c.bg}, ${c.bg}), var(--bg);`);

  const name  = t(c.name);
  const role  = t(c.role);
  const logo  = COMPANY_LOGOS[c.id];
  const logoHtml = logo
    ? `<img src="${escAttr(logo)}" alt="${escAttr(name)}" loading="lazy">`
    : `<span class="bh-logo-init">${escHtml(name.charAt(0))}</span>`;
  const nameTag = c.url
    ? `<a class="bh-name" href="${escAttr(c.url)}" target="_blank" rel="noopener" title="${escAttr(name)}">${escHtml(name)}<span class="bh-ext">↗</span></a>`
    : `<span class="bh-name" title="${escAttr(name)}">${escHtml(name)}</span>`;

  const hdr = document.createElement('div');
  hdr.className = 'band-header';
  hdr.innerHTML = `
    <div class="bh-left">
      <div class="bh-logo">${logoHtml}</div>
      <div class="bh-text">
        ${nameTag}
        <span class="bh-role">${escHtml(role)}</span>
      </div>
    </div>
    <span class="bh-period">
      ${escHtml(fmtDate(c.s, lang))} – ${escHtml(fmtDate(c.e, lang))}
      <em>${escHtml(fmtDuration(c.s, c.e))}</em>
    </span>
  `;
  band.appendChild(hdr);
  root.appendChild(band);
}

// ─────────────────────────────────────────
//  RENDER — PROJECT CARD  (uniform capsule + rail, no variants)
// ─────────────────────────────────────────
function renderCard(wrap, p, comp) {
  const lang    = getLang();
  const slotTop = yp(p.e) + compShift(comp);
  const slotH   = monthsIn(p.s, p.e) * PX;
  const top     = slotTop + GAP / 2;
  const h       = slotH - GAP;

  const { prop, pos, w } = cardPos(p._col, comp.side);

  const name   = t(p.name);
  const genre  = t(p.genre);
  const desc   = t(p.desc);
  const start  = fmtDate(p.s, lang);
  const end    = fmtDate(p.e, lang);
  const dur    = fmtDuration(p.s, p.e);
  const thumb  = PROJECT_THUMBS[p.id];
  const months = monthsIn(p.s, p.e);
  const railLabel = lang === 'ua' ? `${months} міс` : `${months} mo`;

  const card = document.createElement('article');
  const compact = !!comp.ambient;   // freelance quick projects → compact 1-month card
  card.className = 'proj-card anim-item' + (compact ? ' proj-card--compact' : '');
  card.dataset.projId   = p.id;
  card.dataset.compSide = comp.side;
  card.style.cssText = `
    top:${top}px;
    height:${h}px;
    width:${w};
    ${prop}:${pos};
    --cc:${comp.color};
    border-color:${comp.border};
    ${thumb ? `--art:url('${thumb}');` : ''}
  `;

  const thumbHtml = thumb
    ? `<img class="pc-thumb" src="${escAttr(thumb)}" alt="${escAttr(name)}" loading="lazy">`
    : `<span class="pc-thumb pc-thumb--mono">${escHtml(name.charAt(0))}</span>`;

  // Mobile cover: composed preview for portrait-first projects
  // (3 full screens side by side, /assets/covers/), otherwise the first
  // real landscape screen. Hidden on the desktop Gantt via CSS.
  const coverSrc = PROJECT_COVERS[p.id]
    || (typeof PROJECT_SCREENS !== 'undefined' && PROJECT_SCREENS[p.id] && PROJECT_SCREENS[p.id][0])
    || null;
  // <picture> trick: desktop matches the 1px-gif source, so the real JPEG
  // is only ever fetched on ≤1024px viewports where the cover is visible.
  const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const coverHtml = coverSrc
    ? `<picture class="pc-cover" aria-hidden="true">
         <source media="(min-width: 1025px)" srcset="${BLANK_GIF}">
         <img src="${escAttr(coverSrc)}" alt="" loading="lazy">
       </picture>`
    : '';

  const extLinks = p.links.map(l =>
    `<a class="pc-ext" href="${escAttr(l.url)}" target="_blank" rel="noopener" title="${escAttr(l.label)}">${escHtml(l.label)} ↗</a>`
  ).join('');

  // long org names (either language) render at a smaller size so they fit the narrow rail;
  // slots of 2+ months have the height to let the meta line wrap too
  const longName = Math.max(p.name[0].length, p.name[1].length) > 26;
  const roomy = monthsIn(p.s, p.e) >= 2;
  card.innerHTML = compact ? `
    ${coverHtml}
    <div class="pc-capsule pc-capsule--compact${roomy ? ' pc-capsule--roomy' : ''}">
      <div class="pcc-row">
        <span class="pc-name${longName ? ' pc-name--long' : ''}" data-en="${escAttr(p.name[0])}" data-ua="${escAttr(p.name[1])}" title="${escAttr(name)}">${escHtml(name)}</span>
        <svg class="pcc-arrow" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7h9M7.5 3.5 11 7l-3.5 3.5"/></svg>
      </div>
      <span class="pcc-sub" title="${escAttr(`${genre} · ${start} – ${end}`)}">${escHtml(genre)} · ${escHtml(start)}<em class="pcc-dur"> · ${escHtml(dur)}</em></span>
    </div>
  ` : `
    ${coverHtml}
    <div class="pc-capsule">
      <div class="pc-head">
        <div class="pc-id">
          <span class="pc-name" data-en="${escAttr(p.name[0])}" data-ua="${escAttr(p.name[1])}" title="${escAttr(name)}">${escHtml(name)}</span>
          <span class="pc-period" title="${escAttr(`${start} – ${end} · ${dur}`)}">${escHtml(start)} – ${escHtml(end)} · <em>${escHtml(dur)}</em></span>
        </div>
        ${thumbHtml}
      </div>
      <div class="pc-meta">
        ${buildIconChips(p.platform, p.engine)}
        <span class="pc-genre" title="${escAttr(genre)}">${escHtml(genre)}</span>
      </div>
      <p class="pc-desc" data-en="${escAttr(p.desc[0])}" data-ua="${escAttr(p.desc[1])}">${escHtml(desc)}</p>
      <div class="pc-footer">
        <a class="pc-view" href="project.html#${p.id}">
          <span data-en="View project" data-ua="Переглянути">${lang === 'ua' ? 'Переглянути' : 'View project'}</span>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7h9M7.5 3.5 11 7l-3.5 3.5"/></svg>
        </a>
        ${extLinks}
      </div>
    </div>
    <div class="pc-rail">
      <span class="pc-rail-cap"></span>
      <span class="pc-rail-line"></span>
      <span class="pc-rail-label">${escHtml(railLabel)}</span>
      <span class="pc-rail-dot"></span>
    </div>
    <div class="pc-art"></div>
  `;

  // Whole card navigates to the project page (inner links win);
  // keyboard-accessible: focusable + Enter/Space
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.setAttribute('aria-label', `${name} — ${genre}`);
  card.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    window.location.href = `project.html#${p.id}`;
  });
  card.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) {
      e.preventDefault();
      window.location.href = `project.html#${p.id}`;
    }
  });

  // Hover preview (desktop only)
  card.addEventListener('mouseenter', () => {
    if (window.matchMedia('(max-width: 1024px)').matches) return;
    showPreview(p, comp, card);
  });
  card.addEventListener('mouseleave', () => scheduleHidePreview());

  wrap.appendChild(card);
}

// ─────────────────────────────────────────
//  RENDER — COMPANY GROUP
//  (banner is mobile-only chrome; .tl-cards is display:contents
//   on desktop so cards absolutely position against .tl-root)
// ─────────────────────────────────────────
function renderGroup(root, comp, projs) {
  const lang = getLang();
  const group = document.createElement('div');
  group.className = 'tl-group';
  group.dataset.co = comp.id;

  const name = t(comp.name);
  const logo = COMPANY_LOGOS[comp.id];
  const logoHtml = logo
    ? `<img class="tl-co-logo" src="${escAttr(logo)}" alt="${escAttr(name)}" loading="lazy">`
    : `<span class="tl-co-logo-init">${escHtml(name.charAt(0))}</span>`;
  const nameTag = comp.url
    ? `<a class="tl-co-name" href="${escAttr(comp.url)}" target="_blank" rel="noopener">${escHtml(name)}</a>`
    : `<span class="tl-co-name">${escHtml(name)}</span>`;

  const banner = document.createElement('div');
  banner.className = 'tl-co-header';
  banner.style.setProperty('--cc', comp.color);
  banner.innerHTML = `
    <div class="tl-co-left">
      <div class="tl-co-logo-wrap">${logoHtml}</div>
      <div class="tl-co-text">
        ${nameTag}
        <span class="tl-co-role">${escHtml(t(comp.role))}</span>
      </div>
    </div>
    <span class="tl-co-period">
      ${escHtml(fmtDate(comp.s, lang))} – ${escHtml(fmtDate(comp.e, lang))}
      <em>${escHtml(fmtDuration(comp.s, comp.e))}</em>
    </span>
  `;
  group.appendChild(banner);

  if (projs.length) {
    const cards = document.createElement('div');
    cards.className = 'tl-cards';
    projs.forEach(p => renderCard(cards, p, comp));
    group.appendChild(cards);
  }

  root.appendChild(group);
}

// ─────────────────────────────────────────
//  AMBIENT RAIL RELAX — freelance gigs sharing an end month would render
//  at the same top inside the 1-column rail; push later cards down so the
//  natural-height markers stack instead of overlapping. Desktop only
//  (mobile stacks cards statically). Runs after fonts settle heights.
// ─────────────────────────────────────────
function relaxAmbientCards(root) {
  if (!window.matchMedia('(min-width: 1025px)').matches) return;
  const run = () => {
    const groups = {};
    root.querySelectorAll('.proj-card--compact').forEach(c => {
      const key = c.dataset.compSide + '|' + (c.style.left || c.style.right);
      (groups[key] = groups[key] || []).push(c);
    });
    Object.values(groups).forEach(list => {
      list.sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));
      let prevBottom = -Infinity;
      list.forEach(c => {
        let top = parseFloat(c.style.top);
        if (top < prevBottom + 12) {
          top = prevBottom + 12;
          c.style.top = top + 'px';
        }
        prevBottom = top + c.getBoundingClientRect().height;
      });
    });
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
}

// ─────────────────────────────────────────
//  LAYOUT SELF-CHECKS  (console.error only — cheap insurance
//  against future data/CSS edits; never affects rendering)
// ─────────────────────────────────────────
function runLayoutAsserts(root) {
  relaxAmbientCards(root);
  // 1. Data-side geometry: every card must end ≥ GAP/2 above its band bottom edge
  PROJECTS.forEach(p => {
    const comp = COMPANIES.find(c => c.id === p.co);
    const cardBottomPx = yp(p.e) + compShift(comp) + monthsIn(p.s, p.e) * PX - GAP / 2;
    const bb = bandBottom(comp);
    if (cardBottomPx > bb + 0.5) {
      console.error(`[tl-assert] card "${p.id}" bottom ${cardBottomPx} spills past band bottom ${bb}`);
    }
    if (!comp.ambient && monthsIn(p.s, p.e) * PX - GAP < CAPSULE_H) {
      console.error(`[tl-assert] card "${p.id}" is shorter (${monthsIn(p.s, p.e) * PX - GAP}px) than the capsule (${CAPSULE_H}px)`);
    }
  });

  // 2. DOM-side: capsule must never clip (desktop layout only)
  if (window.matchMedia('(min-width: 1025px)').matches) {
    const check = () => root.querySelectorAll('.pc-capsule:not(.pc-capsule--compact)').forEach(cap => {
      if (cap.scrollHeight > cap.clientHeight + 1) {
        console.error(`[tl-assert] capsule overflow in "${cap.closest('.proj-card')?.dataset.projId}": ${cap.scrollHeight} > ${cap.clientHeight}`);
      }
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(check);
  }
}

// ─────────────────────────────────────────
//  HOVER PREVIEW PANEL
// ─────────────────────────────────────────
let pvPanel   = null;
let pvTimer   = null;
let pvHovered = false;

function getOrCreatePanel() {
  if (pvPanel) return pvPanel;
  pvPanel = document.createElement('div');
  pvPanel.id = 'previewPanel';
  pvPanel.className = 'preview-panel';
  pvPanel.innerHTML = `
    <div class="pv-thumb-area"></div>
    <div class="pv-body">
      <div class="pv-header">
        <div class="pv-icons"></div>
        <span class="pv-name"></span>
        <span class="pv-period"></span>
      </div>
      <p class="pv-desc"></p>
      <div class="pv-actions"></div>
    </div>
  `;
  pvPanel.addEventListener('mouseenter', () => { pvHovered = true; clearTimeout(pvTimer); });
  pvPanel.addEventListener('mouseleave', () => scheduleHidePreview());
  document.body.appendChild(pvPanel);
  return pvPanel;
}

function showPreview(p, comp, cardEl) {
  clearTimeout(pvTimer);
  pvHovered = true;
  const panel = getOrCreatePanel();
  const lang  = getLang();

  const name    = t(p.name);
  const desc    = t(p.desc);
  const start   = fmtDate(p.s, lang);
  const end     = fmtDate(p.e, lang);
  const dur     = fmtDuration(p.s, p.e);
  const screens = (p.screens && p.screens.length) ? p.screens : (PROJECT_SCREENS[p.id] || []);
  const thumb   = PROJECT_THUMBS[p.id];

  const thumbArea = panel.querySelector('.pv-thumb-area');
  thumbArea.style.setProperty('--cc', comp.color);
  // composed covers (same as the mobile cards) read better than a cropped
  // portrait screenshot; fall back to the first real screen
  const pvCover = (typeof PROJECT_COVERS !== 'undefined' && PROJECT_COVERS[p.id]) || screens[0];
  if (pvCover) {
    thumbArea.innerHTML = `<img src="${escAttr(pvCover)}" alt="${escAttr(name)}" class="pv-thumb-img" loading="lazy">`;
  } else if (thumb) {
    thumbArea.innerHTML = `
      <div class="pv-thumb-placeholder" style="background:linear-gradient(135deg,${comp.color}1a,${comp.color}06)">
        <img src="${escAttr(thumb)}" alt="${escAttr(name)}" class="pv-icon-large" loading="lazy">
      </div>`;
  } else {
    thumbArea.innerHTML = `
      <div class="pv-thumb-placeholder" style="background:linear-gradient(135deg,${comp.color}1a,${comp.color}06)">
        <span class="pv-initials" style="color:${comp.color}">${escHtml(name.charAt(0))}</span>
      </div>`;
  }

  panel.querySelector('.pv-name').textContent = name;
  panel.querySelector('.pv-name').style.color = comp.color;
  panel.querySelector('.pv-period').textContent = `${start} – ${end} · ${dur}`;
  panel.querySelector('.pv-desc').textContent  = desc;
  panel.querySelector('.pv-icons').innerHTML   = buildIconImgs(p.platform, p.engine, 'pv-icon');

  const actions = panel.querySelector('.pv-actions');
  actions.innerHTML = `
    <a href="project.html#${p.id}" class="pv-btn" style="--cc:${comp.color}">
      ${lang === 'ua' ? 'Детальніше' : 'View project'} →
    </a>
    ${p.links.map(l => `<a href="${escAttr(l.url)}" class="pv-link-ext" target="_blank" rel="noopener">${escHtml(l.label)}</a>`).join('')}
  `;

  panel.style.cssText = 'display:block; opacity:0; transform:translateY(6px); transition:opacity .18s ease, transform .18s ease;';
  positionPanel(panel, cardEl, comp.side);

  requestAnimationFrame(() => {
    panel.style.opacity  = '1';
    panel.style.transform = 'translateY(0)';
  });
}

function positionPanel(panel, cardEl, side) {
  const rect = cardEl.getBoundingClientRect();
  const pvW  = 300;
  const gap  = 14;
  let left;

  if (side === 'right') {
    const rightFree = window.innerWidth - rect.right - gap;
    left = rightFree >= pvW ? rect.right + gap : rect.left - pvW - gap;
  } else {
    const leftFree = rect.left - gap;
    left = leftFree >= pvW ? rect.left - pvW - gap : rect.right + gap;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - pvW - 8));

  // Measure the real panel height (display:block is already set)
  // so the panel never extends past the viewport bottom
  const panelH = panel.offsetHeight || 480;
  let top = rect.top;
  top = Math.max(68, Math.min(top, window.innerHeight - panelH - 8));

  panel.style.left = left + 'px';
  panel.style.top  = top  + 'px';
}

function scheduleHidePreview() {
  pvHovered = false;
  pvTimer = setTimeout(() => {
    if (pvHovered) return;
    if (pvPanel) {
      pvPanel.style.opacity   = '0';
      pvPanel.style.transform = 'translateY(6px)';
      setTimeout(() => { if (!pvHovered && pvPanel) pvPanel.style.display = 'none'; }, 200);
    }
  }, 100);
}

// ─────────────────────────────────────────
//  VIEW TOOLBAR  (timeline / list / tiles + filters)
// ─────────────────────────────────────────
const VIEW_DEFS = [
  ['timeline', 'Timeline', 'Таймлайн', '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1v12M3 3.5h3M3 7h3M8 5h3M8 9.5h3"/></svg>'],
  ['list',     'List',     'Список',   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4.5 3h8M4.5 7h8M4.5 11h8M1.5 3h.01M1.5 7h.01M1.5 11h.01"/></svg>'],
  ['tiles',    'Tiles',    'Плитки',   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>'],
];

function renderToolbar() {
  const bar = document.getElementById('tlToolbar');
  if (!bar) return;
  const lang = getLang();
  const ua = lang === 'ua';

  const viewBtns = VIEW_DEFS.map(([key, en, uaL, icon]) => `
    <button class="tb-view${viewState.view === key ? ' active' : ''}" data-view="${key}">
      ${icon}<span>${ua ? uaL : en}</span>
    </button>`).join('');

  // Platform — three icon toggles (click active one again → all)
  const PLAT_ICONS = {
    desktop: '/assets/icons/platforms/desktop.svg',
    mobile:  '/assets/icons/platforms/mobile.svg',
    web:     '/assets/icons/platforms/web.svg',
  };
  const platBtns = FILTER_DEFS.plat.options
    .filter(([v]) => v !== 'all')
    .map(([val, en, uaL]) => `
      <button class="tb-plat${viewState.filters.plat === val ? ' active' : ''}" data-val="${val}"
              title="${escAttr(ua ? uaL : en)}" aria-label="${escAttr(ua ? uaL : en)}" aria-pressed="${viewState.filters.plat === val}">
        <img src="${PLAT_ICONS[val]}" alt="">
      </button>`).join('');

  // Genre / style — compact dropdowns
  const select = dim => {
    const def = FILTER_DEFS[dim];
    return `
      <label class="tb-selwrap">
        <span class="tb-sel-label">${escHtml(def.label[ua ? 1 : 0])}</span>
        <select class="tb-select" data-dim="${dim}">
          ${def.options.map(([val, en, uaL]) =>
            `<option value="${val}"${viewState.filters[dim] === val ? ' selected' : ''}>${escHtml(ua ? uaL : en)}</option>`).join('')}
        </select>
      </label>`;
  };

  bar.innerHTML = `
    <div class="tb-row">
      <div class="tb-views" role="tablist">${viewBtns}</div>
      <span class="tb-sep" aria-hidden="true"></span>
      <div class="tb-plats" role="group" aria-label="${ua ? 'Платформа' : 'Platform'}">${platBtns}</div>
      <span class="tb-sep" aria-hidden="true"></span>
      ${select('genre')}
      ${select('style')}
    </div>
  `;

  bar.querySelectorAll('.tb-view').forEach(b => b.addEventListener('click', () => {
    viewState.view = b.dataset.view;
    localStorage.setItem('v2-view', viewState.view);
    bar.querySelectorAll('.tb-view').forEach(x => x.classList.toggle('active', x === b));
    applyView();
  }));

  bar.querySelectorAll('.tb-plat').forEach(b => b.addEventListener('click', () => {
    const val = b.dataset.val;
    viewState.filters.plat = viewState.filters.plat === val ? 'all' : val;
    bar.querySelectorAll('.tb-plat').forEach(x => {
      const on = x.dataset.val === viewState.filters.plat;
      x.classList.toggle('active', on);
      x.setAttribute('aria-pressed', String(on));
    });
    applyFilters();
  }));

  bar.querySelectorAll('.tb-select').forEach(s => s.addEventListener('change', () => {
    viewState.filters[s.dataset.dim] = s.value;
    applyFilters();
  }));
}

function applyView() {
  const tl    = document.getElementById('tlRoot');
  const list  = document.getElementById('tlList');
  const tiles = document.getElementById('tlTiles');
  if (!tl) return;
  tl.classList.toggle('view-hidden', viewState.view !== 'timeline');
  if (list)  list.hidden  = viewState.view !== 'list';
  if (tiles) tiles.hidden = viewState.view !== 'tiles';
}

function applyFilters() {
  // Timeline: cards keep their time positions — dim non-matching
  document.querySelectorAll('#tlRoot .proj-card').forEach(card => {
    const p = PROJECTS.find(x => x.id === card.dataset.projId);
    card.classList.toggle('is-filtered', p ? !projectMatches(p) : false);
  });
  // List / tiles: hide non-matching entries
  ['tlList', 'tlTiles'].forEach(id => {
    const root = document.getElementById(id);
    if (!root) return;
    root.querySelectorAll('[data-proj-id]').forEach(el => {
      const p = PROJECTS.find(x => x.id === el.dataset.projId);
      el.classList.toggle('view-hidden', p ? !projectMatches(p) : false);
    });
  });
}

// ─────────────────────────────────────────
//  RENDER — LIST VIEW  (numbered editorial rows)
// ─────────────────────────────────────────
function renderList() {
  const root = document.getElementById('tlList');
  if (!root) return;
  const lang = getLang();
  root.innerHTML = '';

  const sorted = [...PROJECTS].sort((a, b) => mn(b.e) - mn(a.e));
  sorted.forEach(p => {
    const comp = COMPANIES.find(c => c.id === p.co);
    const name = t(p.name);
    const screens = (p.screens && p.screens.length) ? p.screens : (PROJECT_SCREENS[p.id] || []);
    const cover = screens[0] || PROJECT_THUMBS[p.id] || '';
    const row = document.createElement('a');
    row.className = 'lst-row';
    row.href = `project.html#${p.id}`;
    row.dataset.projId = p.id;
    row.style.setProperty('--cc', comp.color);
    row.innerHTML = `
      <span class="lst-thumb">
        ${cover
          ? `<img src="${escAttr(cover)}" alt="${escAttr(name)}" loading="lazy">`
          : `<span class="lst-mono">${escHtml(name.charAt(0))}</span>`}
      </span>
      <div class="lst-body">
        <span class="lst-name">${escHtml(name)}</span>
        <span class="lst-meta">
          <em style="color:${comp.color}">${escHtml(t(comp.name))}</em>
          · ${escHtml(fmtDate(p.s, lang))} – ${escHtml(fmtDate(p.e, lang))}
          · ${escHtml(t(p.genre))}
        </span>
        <span class="lst-desc">${escHtml(t(p.desc))}</span>
      </div>
      <span class="lst-arrow" aria-hidden="true">→</span>
    `;
    root.appendChild(row);
  });
}

// ─────────────────────────────────────────
//  RENDER — TILES VIEW  (cover grid)
// ─────────────────────────────────────────
function renderTiles() {
  const root = document.getElementById('tlTiles');
  if (!root) return;
  const lang = getLang();
  root.innerHTML = '';

  const sorted = [...PROJECTS].sort((a, b) => mn(b.e) - mn(a.e));
  sorted.forEach(p => {
    const comp = COMPANIES.find(c => c.id === p.co);
    const name = t(p.name);
    const screens = (p.screens && p.screens.length) ? p.screens : (PROJECT_SCREENS[p.id] || []);
    const cover = screens[0] || PROJECT_THUMBS[p.id] || '';
    const tile = document.createElement('a');
    tile.className = 'tile';
    tile.href = `project.html#${p.id}`;
    tile.dataset.projId = p.id;
    tile.style.setProperty('--cc', comp.color);
    tile.innerHTML = `
      <div class="tile-cover">
        ${cover
          ? `<img src="${escAttr(cover)}" alt="${escAttr(name)}" loading="lazy">`
          : `<span class="tile-mono">${escHtml(name.charAt(0))}</span>`}
      </div>
      <div class="tile-veil"></div>
      <div class="tile-info">
        <span class="tile-name">${escHtml(name)}</span>
        <span class="tile-meta">${escHtml(t(p.genre))} · ${escHtml(fmtDate(p.s, lang))} – ${escHtml(fmtDate(p.e, lang))}</span>
      </div>
    `;
    root.appendChild(tile);
  });
}

// ─────────────────────────────────────────
//  MAIN RENDER
// ─────────────────────────────────────────
function renderTimeline() {
  const root = document.getElementById('tlRoot');
  if (!root) return;

  root.innerHTML = '';
  root.classList.add('tl-root');

  const totalH = totalHeight();
  root.style.height = totalH + 'px';

  assignColumns();
  renderAxis(root, totalH);

  // Bands: ambient (freelance) first so solid bands paint above it
  [...COMPANIES]
    .sort((a, b) => (b.ambient ? 1 : 0) - (a.ambient ? 1 : 0))
    .forEach(c => renderBand(root, c, totalH));

  // Groups: companies most-recent-first; projects most-recent-first.
  // Companies WITHOUT projects (freelance) still get a group — their
  // banner is the only mobile representation of that experience.
  // (this DOM order IS the mobile stack order — do not reorder)
  [...COMPANIES]
    .sort((a, b) => mn(b.e) - mn(a.e))
    .forEach(comp => {
      const projs = PROJECTS
        .filter(p => p.co === comp.id)
        .sort((a, b) => mn(b.e) - mn(a.e));
      renderGroup(root, comp, projs);
    });

  runLayoutAsserts(root);

  // Companion views + toolbar (bilingual — rebuilt on every render)
  renderToolbar();
  renderList();
  renderTiles();
  applyView();
  applyFilters();
  renderMarquee();

  // Scroll-in animations
  setTimeout(() => {
    document.querySelectorAll('.anim-item').forEach(el => {
      if (tlObserver) tlObserver.observe(el);
    });
  }, 50);
}

// ─────────────────────────────────────────
//  MARQUEE — two scroll-driven screenshot rows (hero follow-up)
//  Populated from every known screenshot; script.js drives the
//  translateX on scroll.
// ─────────────────────────────────────────
// Hand-picked landscape gameplay/UI shots only — the strip is a
// showreel, not a dump of every asset.
const MARQUEE_SHOTS_A = [
  '/assets/screenshots/sweep/lobby.jpg',
  '/assets/screenshots/figma/evio-1.jpg',
  '/assets/screenshots/web/undead-web-1.jpg',
  '/assets/screenshots/tadafish/tadafish-5.jpg',
  '/assets/screenshots/thinks/thinks-1.jpg',
  '/assets/screenshots/web/gunbit-drive-1.jpg',
  '/assets/screenshots/figma/tantra-1.jpg',
];
const MARQUEE_SHOTS_B = [
  '/assets/screenshots/sweep/providers.jpg',
  '/assets/screenshots/web/racer-web-1.jpg',
  '/assets/screenshots/simgate/simgate-1.jpg',
  '/assets/screenshots/figma/funrun-1.jpg',
  '/assets/screenshots/web/meegos-web-3.jpg',
  '/assets/screenshots/sweep/banner.jpg',
  '/assets/screenshots/trademule/trademule-1.jpg',
];

function renderMarquee() {
  const row1 = document.getElementById('mqRow1');
  const row2 = document.getElementById('mqRow2');
  if (!row1 || !row2) return;

  const build = list => list.map(src =>
    `<div class="mq-tile"><img src="${escAttr(src)}" alt="" loading="lazy"></div>`).join('');
  // triple each list for seamless travel
  const a = build(MARQUEE_SHOTS_A);
  const b = build(MARQUEE_SHOTS_B);
  row1.innerHTML = a + a + a;
  row2.innerHTML = b + b + b;
}

// ─────────────────────────────────────────
//  INIT
//  (named tlObserver — script.js declares its own `observer`
//   in the same global scope; a duplicate binding would throw
//   and kill script.js entirely)
// ─────────────────────────────────────────
let tlObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  tlObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        tlObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });

  renderTimeline();

  // Re-render on language toggle (script.js flips data-lang first)
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderTimeline, 20));
  });
});
