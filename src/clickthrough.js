import { isMraidUsable } from './mraid.js';

let lastTapAt = -Infinity;

export function handleMraidOpen(targetUrl) {
  const mraid = window.mraid;
  const url = targetUrl || window.clickTag || window.clickTag1 ||
    window.clickthrough || window.clickThrough || '';
  // Preview hosts may omit clickTag; still dispatch the user click to MRAID.
  // Keep the URL argument for hosts that inject a campaign destination.
  if (typeof url !== 'string' || !isMraidUsable(mraid) ||
      typeof mraid.open !== 'function') return false;

  const now = Date.now();
  if (now - lastTapAt < 500) return false;
  lastTapAt = now;
  try {
    mraid.open(url);
    return true;
  } catch {
    return false;
  }
}

export const openClickthrough = handleMraidOpen;
