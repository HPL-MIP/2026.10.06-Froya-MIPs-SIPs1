import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeWhenMraidReady, observeViewability } from '../src/mraid.js';
import { handleMraidOpen } from '../src/clickthrough.js';

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
  const mraid = emitter({ getState: () => state, isViewable: () => viewable,
    open: url => opened.push(url) });
  globalThis.window = emitter({ mraid });
  globalThis.document = emitter({ visibilityState: 'visible' });
  let mounted = 0;
  initializeWhenMraidReady(() => mounted++);
  assert.equal(mounted, 0);
  window.clickTag = 'https://example.com/product';
  assert.equal(handleMraidOpen(), false);
  state = 'default';
  mraid.emit('ready');
  mraid.emit('ready');
  assert.equal(mounted, 1);
  const realNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    assert.equal(handleMraidOpen(), true);
    assert.equal(handleMraidOpen(), false);
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
    assert.deepEqual(opened, ['https://example.com/product', 'https://example.com/alternate', 'https://example.com/explicit', '']);
  } finally { Date.now = realNow; }
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
