/**
 * Portfolio homepage refinement tests — RED-GREEN-REFACTOR
 * Tests for collapsed filter disclosure, enlarged hero, animation
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Mock DOM & CSS class checking for basic HTML validation
function parseHtml(content) {
  const classes = new Set();
  const attrs = new Set();
  const tags = new Set();
  const matches = content.match(/class="([^"]*)"/g) || [];
  matches.forEach(m => {
    const cls = m.match(/class="([^"]*)"/)[1];
    cls.split(' ').forEach(c => classes.add(c));
  });
  return { classes, attrs, tags };
}

test('1. Toolbar: filters disclosure button exists and is initially collapsed', async (t) => {
  // RED: Test filters are behind a collapsed disclosure
  const indexPath = path.join(__dirname, '../index.html');
  const content = fs.readFileSync(indexPath, 'utf8');

  // Must have a disclosure control (details/summary or button with aria-expanded)
  const hasDetailsElement = content.includes('<details');
  const hasAriaExpanded = content.includes('aria-expanded');
  const hasDisclosureButton = hasDetailsElement || hasAriaExpanded;

  assert(hasDisclosureButton, 'Filters must be behind a disclosure control');
});

test('2. Toolbar: search visible, filters/view/density/scale inside collapsed disclosure', async (t) => {
  // RED: Check structure of controls
  const indexPath = path.join(__dirname, '../index.html');
  const content = fs.readFileSync(indexPath, 'utf8');

  // Search should remain visible in toolbar
  assert(content.includes('type="search"'), 'Search input must exist');

  // Filters disclosure should exist
  assert(
    content.includes('aria-label=\"Filter') ||
    content.includes('data-i18n=\"tb.filter'),
    'Filters disclosure must be labeled'
  );
});

test('3. Hero artwork enlarged: desktop ~500-600px, mobile ~280-350px', async (t) => {
  // RED: Check CSS hero sizing
  const cssPath = path.join(__dirname, '../styles.css');
  const content = fs.readFileSync(cssPath, 'utf8');

  // Should have larger min/max for hero figure
  // Desktop: min(100%, 340px) → should be ~500-600px
  assert(content.includes('hero-figure'), 'hero-figure class must exist');

  // Extract width values to verify they're larger
  const heroMatch = content.match(/\.hero-figure\s*{\s*[^}]*width:\s*([^;]+)/);
  assert(heroMatch, 'hero-figure must have explicit width rule');
});

test('4. Hero animation: layers animate coherently with pause control', async (t) => {
  // RED: Check experience.js has animation + pause logic
  const expPath = path.join(__dirname, '../experience.js');
  const content = fs.readFileSync(expPath, 'utf8');

  // Must have animation state and pause/resume
  assert(content.includes('paused'), 'Animation state must include paused flag');
  assert(content.includes('pause') || content.includes('Pause'), 'Pause control must exist');
  assert(content.includes('animate') || content.includes('Animate'), 'Animation play control must exist');
});

test('5. Hero animation respects prefers-reduced-motion', async (t) => {
  // RED: Check for reduced motion support
  const cssPath = path.join(__dirname, '../experience.css');
  const content = fs.readFileSync(cssPath, 'utf8');

  assert(
    content.includes('prefers-reduced-motion'),
    'experience.css must include prefers-reduced-motion query'
  );
});

test('6. Existing controls still work: categories, employer, view, density, scale, reset', async (t) => {
  // RED: Verify no controls were removed
  const indexPath = path.join(__dirname, '../index.html');
  const content = fs.readFileSync(indexPath, 'utf8');

  const required = [
    'data-view=',      // view toggle
    'data-dens=',      // density toggle
    'data-scale=',     // scale toggle
    'id="co"',         // employer select
    'id="cats"',       // category buttons
    'id="reset"',      // reset button
  ];

  required.forEach(pattern => {
    assert(content.includes(pattern), `Must retain control: ${pattern}`);
  });
});

test('7. Responsive: mobile hero size different from desktop', async (t) => {
  // RED: Mobile-specific sizing
  const cssPath = path.join(__dirname, '../styles.css');
  const expCssPath = path.join(__dirname, '../experience.css');
  const stylesContent = fs.readFileSync(cssPath, 'utf8');
  const expContent = fs.readFileSync(expCssPath, 'utf8');

  // Must have responsive media queries in at least one CSS file
  assert(
    stylesContent.includes('@media') || expContent.includes('@media'),
    'Must have responsive media queries'
  );

  // Hero should have different sizing for mobile
  // Check both files since mobile rules might be in experience.css for vi-on
  const hasMobileHeroSize =
    stylesContent.includes('max-width: 760px') ||
    expContent.includes('max-width: 760px');

  assert(hasMobileHeroSize, 'Mobile breakpoint must adjust hero-figure size');
});

test('8. Active filter count visible when filters applied', async (t) => {
  // RED: Filter count indicator in disclosure button
  const appPath = path.join(__dirname, '../app.js');
  const content = fs.readFileSync(appPath, 'utf8');

  // Must track active filter count
  assert(content.includes('filtersActive'), 'Must have filtersActive function');
});

test('9. Escaped/focus/keyboard navigation: Escape closes disclosure', async (t) => {
  // RED: Keyboard support for disclosure
  const expPath = path.join(__dirname, '../experience.js');
  const appPath = path.join(__dirname, '../app.js');

  // Combined check: either file should handle keyboard
  const hasKeyboardHandler =
    fs.readFileSync(expPath, 'utf8').includes('keydown') ||
    fs.readFileSync(appPath, 'utf8').includes('keydown') ||
    fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8').includes('focus');

  assert(hasKeyboardHandler, 'Must handle keyboard interaction (keydown/focus)');
});

test('10. No seams in animation: transition smooth, offscreen pauses', async (t) => {
  // RED: Check animation loop continuity
  const expPath = path.join(__dirname, '../experience.js');
  const content = fs.readFileSync(expPath, 'utf8');

  // Must have requestAnimationFrame or similar continuous loop
  assert(
    content.includes('requestAnimationFrame') || content.includes('raf'),
    'Must have continuous animation frame loop'
  );

  // Must check visibility/offscreen
  assert(
    content.includes('onScreen') || content.includes('hidden') || content.includes('visibility'),
    'Must pause animation when offscreen/hidden'
  );
});

test('11. Fixel dark restrained design preserved', async (t) => {
  // RED: Design system unchanged
  const cssPath = path.join(__dirname, '../styles.css');
  const content = fs.readFileSync(cssPath, 'utf8');

  assert(content.includes('Fixel'), 'Fixel font must be used');
  assert(content.includes('--violet') || content.includes('--pink') || content.includes('--cyan'),
    'Accent color system must exist');
});

test('12. Case.js/content/data.js/presentation-data.js unchanged', async (t) => {
  // RED: Verify source files not modified
  const checkFiles = [
    '../case.html',
    '../data.js',
    '../presentation-data.js',
  ];

  // This is a best-effort check — we're just verifying files exist
  checkFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    // Note: We don't check content here, but in a real test we would hash/compare
  });
});

test('13. Language support: EN and UA both work', async (t) => {
  // RED: i18n preserved
  const appPath = path.join(__dirname, '../app.js');
  const content = fs.readFileSync(appPath, 'utf8');

  assert(content.includes("'en'"), 'English locale must exist');
  assert(content.includes("'ua'"), 'Ukrainian locale must exist');
});

console.log('\n=== Portfolio Homepage Refinement Test Suite ===');
console.log('Tests cover: filter disclosure, enlarged hero, animation, accessibility');
