import { isMraidUsable } from './mraid.js';

let lastTapAt = -Infinity;

export function getClickTarget(u) {
  if (typeof u === 'string' && u.length > 0) return u;
  if (typeof window !== 'undefined') {
    return window.clickTag || window.clickTag1 || window.clickthrough || window.clickThrough || '';
  }
  return '';
}

export function handleMraidOpen(targetUrl) {
  const mraid = typeof window !== 'undefined' ? window.mraid : undefined;
  const url = getClickTarget(targetUrl);

  if (typeof url !== 'string' || !isMraidUsable(mraid) || typeof mraid.open !== 'function') {
    return false;
  }

  const now = Date.now();
  if (now - lastTapAt < 500) return false;
  lastTapAt = now;

  try {
    mraid.open(url);
    return true;
  } catch (err) {
    console.error('[MRAID] open threw', err);
    return false;
  }
}

export function handleClickAction(targetUrl) {
  return handleMraidOpen(targetUrl);
}

export function handleTap(event, targetUrl) {
  const now = Date.now();
  if (now - lastTapAt < 500) return false;
  return handleMraidOpen(targetUrl);
}

export const openClickthrough = handleMraidOpen;

if (typeof window !== 'undefined') {
  window.handleMraidOpen = handleMraidOpen;
  window.handleClickAction = () => handleMraidOpen();
  window['openClickThrough'] = window.handleClickAction;
  window.handleTap = handleTap;
}
