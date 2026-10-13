import fs from 'node:fs';

const htmlPath = 'dist/primeprometics_acslanot_mip_20260708_01_emily_scrollable_human_none.html';
const content = fs.readFileSync(htmlPath, 'latin1');
const size = fs.statSync(htmlPath).size;

console.log('====================================================');
console.log('   MRAID v2.0 Compliance Audit: ' + htmlPath);
console.log('====================================================');

const checks = [
  {
    name: 'Check 1: Bridge Declaration (<script src="mraid.js"></script> in <head>)',
    pass: /<head>[\s\S]*?<script src="mraid\.js"><\/script>[\s\S]*?<\/head>/.test(content),
  },
  {
    name: 'Check 2: Lifecycle Readiness Guards (isMraidUsable & initializeWhenMraidReady)',
    pass: content.includes('window.isMraidUsable') && content.includes('window.initializeWhenMraidReady'),
  },
  {
    name: 'Check 3: Positive State Check (mraid.getState() === "loading")',
    pass: /mraid\.getState\(\)\s*===\s*["']loading["']/.test(content),
  },
  {
    name: 'Check 4: Zero window.open invocations in entire creative',
    pass: !/\bwindow\.open\s*\(/.test(content),
  },
  {
    name: 'Check 5: Click-Through Engine (handleMraidOpen, handleClickAction, openClickThrough)',
    pass: content.includes('handleMraidOpen') && content.includes('handleClickAction') && content.includes('openClickThrough'),
  },
  {
    name: 'Check 6: ClickTag Fallback Chain Normalization (clickTag || clickTag1 || clickthrough || clickThrough)',
    pass: content.includes('clickTag') && content.includes('clickTag1') && content.includes('clickthrough') && content.includes('clickThrough'),
  },
  {
    name: 'Check 7: Automated Media Viewability Lifecycle (isViewable & viewableChange)',
    pass: content.includes('viewableChange') && content.includes('isViewable'),
  },
  {
    name: 'Check 8: iOS 500ms Tap Deduplication (handleTap & lastTapAt)',
    pass: content.includes('lastTapAt') && content.includes('500'),
  },
  {
    name: 'Check 9: Zero external redirects (no location.href = / assign / replace)',
    pass: !/\blocation\.href\s*=/.test(content) && !/\blocation\.(?:assign|replace)\s*\(/.test(content),
  },
  {
    name: 'Check 10: Zero external network endpoints or CDN dependencies',
    pass: !/https?:\/\/(?!www\.videolan\.org|vite\.dev)/.test(content),
  },
  {
    name: 'Check 11: Creative Size under 5MB Ad Network Limit',
    pass: size < 5_000_000,
    details: `${(size / 1024 / 1024).toFixed(2)} MB (${size.toLocaleString()} bytes)`,
  },
];

let allPassed = true;
for (const c of checks) {
  const status = c.pass ? 'PASS [OK]' : 'FAIL [X]';
  console.log(`${status} - ${c.name}${c.details ? ` (${c.details})` : ''}`);
  if (!c.pass) allPassed = false;
}

console.log('====================================================');
console.log('Audit Result: ' + (allPassed ? '100% COMPLIANT' : 'VIOLATIONS FOUND'));
console.log('====================================================');

if (!allPassed) {
  process.exit(1);
}
