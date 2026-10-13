import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeWhenMraidReady, observeViewability, isMraidUsable, trackMraidReadiness } from '../src/mraid.js';
import { handleMraidOpen, handleClickAction, handleTap, getClickTarget } from '../src/clickthrough.js';

function emitter(target = {}) {
  const listeners = new Map();
  target.addEventListener = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
  };
  target.removeEventListener = (name, fn) => listeners.get(name)?.delete(fn);
  target.emit = (name) => [...(listeners.get(name) || [])].forEach(fn => fn());
  return target;
}

test('MRAID readiness, click routing, debounce, and viewability lifecycle', () => {
  let state = 'loading';
  let viewable = true;
  const opened = [];
  const mraid = emitter({
    getState: () => state,
    isViewable: () => viewable,
    open: url => opened.push(url),
  });
  globalThis.window = emitter({ mraid });
  globalThis.document = emitter({ visibilityState: 'visible' });

  assert.equal(isMraidUsable(mraid), false);
  let mounted = 0;
  initializeWhenMraidReady(() => mounted++);
  assert.equal(mounted, 0);

  window.clickTag = 'https://example.com/product';
  assert.equal(handleMraidOpen(), false);

  state = 'default';
  assert.equal(isMraidUsable(mraid), true);
  mraid.emit('ready');
  mraid.emit('ready');
  assert.equal(mounted, 1);

  const realNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    assert.equal(handleMraidOpen(), true);
    assert.equal(handleMraidOpen(), false); // debounced within 500ms
    now += 500;
    window.clickTag = '';
    window.clickTag1 = 'https://example.com/alternate';
    assert.equal(handleMraidOpen(), true);
    now += 500;
    assert.equal(handleMraidOpen('https://example.com/explicit'), true);
    now += 500;
    window.clickTag1 = '';
    assert.equal(handleMraidOpen(), true);
    assert.equal(handleMraidOpen(), false);

    // Test handleTap iOS debounce
    now += 500;
    assert.equal(handleTap({ type: 'touchend' }, 'https://example.com/tap'), true);
    assert.equal(handleTap({ type: 'click' }, 'https://example.com/tap'), false);
    now += 500;
    assert.equal(handleClickAction('https://example.com/cta'), true);

    assert.deepEqual(opened, [
      'https://example.com/product',
      'https://example.com/alternate',
      'https://example.com/explicit',
      '',
      'https://example.com/tap',
      'https://example.com/cta',
    ]);
  } finally {
    Date.now = realNow;
  }

  const changes = [];
  const cleanup = observeViewability(value => changes.push(value));
  assert.equal(changes.at(-1), true);
  viewable = false;
  mraid.emit('viewableChange');
  assert.equal(changes.at(-1), false);
  window.emit('focus');
  assert.equal(changes.at(-1), false);
  viewable = true;
  mraid.emit('viewableChange');
  assert.equal(changes.at(-1), true);
  document.visibilityState = 'hidden';
  document.emit('visibilitychange');
  assert.equal(changes.at(-1), false);
  cleanup();
  const count = changes.length;
  mraid.emit('viewableChange');
  assert.equal(changes.length, count);

  delete window.mraid;
  initializeWhenMraidReady(() => mounted++);
  assert.equal(mounted, 2);
  assert.equal(handleMraidOpen('https://example.com'), false);
});

test('MRAID static compliance inspection on index.html and end scene', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const sipHtml = fs.readFileSync('src/assets/end/sip-date-20261007-0931.html', 'utf8');

  // Check 1: Bridge Declaration strictly in <head>
  assert.match(indexHtml, /<head>[\s\S]*?<script src="mraid\.js"><\/script>[\s\S]*?<\/head>/);
  assert.match(sipHtml, /<head>[\s\S]*?<script src="mraid\.js"><\/script>[\s\S]*?<\/head>/);

  // Check 2: Lifecycle Readiness Guards injected
  assert.match(indexHtml, /window\.isMraidUsable/);
  assert.match(indexHtml, /window\.initializeWhenMraidReady/);

  // Check 3: Explicit positive equality state check
  assert.match(indexHtml, /mraid\.getState\(\)\s*===\s*["']loading["']/);
  assert.match(sipHtml, /mraid\.getState\(\)\s*===\s*["']loading["']/);
  assert.doesNotMatch(indexHtml, /mraid\.getState\(\)\s*!==\s*["']loading["']/);
  assert.doesNotMatch(sipHtml, /mraid\.getState\(\)\s*!==\s*["']loading["']/);

  // Check 4: Zero window.open invocations
  assert.doesNotMatch(indexHtml, /\bwindow\.open\s*\(/);
  assert.doesNotMatch(sipHtml, /\bwindow\.open\s*\(/);

  // Check 5: Click-through engine handleMraidOpen defined
  assert.match(indexHtml, /window\.handleMraidOpen/);
  assert.match(indexHtml, /window\.handleClickAction/);
  assert.match(indexHtml, /window\[["']openClickThrough["']\]/);

  // Check 7: Media viewability lifecycle script present
  assert.match(indexHtml, /viewableChange/);
  assert.match(indexHtml, /isViewable/);

  // Check 8: Tap deduplication
  assert.match(indexHtml, /window\.handleTap/);

  // Check 9: Zero location redirect calls
  assert.doesNotMatch(indexHtml, /\blocation\.href\s*=/);
  assert.doesNotMatch(indexHtml, /\blocation\.(?:assign|replace)\s*\(/);
  assert.doesNotMatch(sipHtml, /\blocation\.href\s*=/);
  assert.doesNotMatch(sipHtml, /\blocation\.(?:assign|replace)\s*\(/);
});
