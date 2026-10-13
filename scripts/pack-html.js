import { gzipSync, gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

// Store gzip bytes directly in a Windows-1252 HTML data block to avoid
// base64's 33% overhead. Escape HTML parser-sensitive bytes losslessly.
export function packHtml(html) {
  const compressed = gzipSync(html, { level: 9 });
  const escaped = [];
  for (const byte of compressed) {
    if ([0, 13, 27, 60].includes(byte)) escaped.push(27, byte + 64);
    else escaped.push(byte);
  }
  const payload = Buffer.from(escaped);
  const prefix = `<!doctype html>
<html lang="en">
<head>
  <meta charset="windows-1252">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Frøya Organics</title>
  <script src="mraid.js"></script>
  <script>
  (function(){
    var r = false, a = false;
    function track(m){
      if (a || !m || typeof m.addEventListener !== "function") return;
      try {
        m.addEventListener("ready", function(){ r = true; });
        a = true;
      } catch(e) {}
    }
    window.isMraidUsable = function(m){
      if (!m) return false;
      track(m);
      if (typeof m.getState !== "function") return true;
      try {
        var s = m.getState();
        return s === "default" || s === "expanded";
      } catch(e) { return r; }
    };
    window.trackMraidReadiness = track;
    window.initializeWhenMraidReady = function(init){
      var m = window.mraid;
      if (!m || typeof m.getState !== "function") { init(); return; }
      track(m);
      if (mraid.getState() === "loading") {
        var h = function(){
          if (typeof m.removeEventListener === "function") m.removeEventListener("ready", h);
          r = true;
          init();
        };
        if (typeof m.addEventListener === "function") {
          m.addEventListener("ready", h);
        } else {
          init();
        }
        return;
      }
      init();
    };
  })();
  </script>
  <script>
  /* MRAID v2.0 Compliant Click-Through Engine (AppLovin MIP) */
  (function(){
    function getClickTarget(u){
      return u || window.clickTag || window.clickTag1 || window.clickthrough || window.clickThrough || "";
    }
    window.handleMraidOpen = function(targetUrl){
      var mraid = window.mraid;
      var url = getClickTarget(targetUrl);
      if (mraid && typeof mraid.open === "function") {
        var ready = true;
        if (typeof window.isMraidUsable === "function") {
          ready = window.isMraidUsable(mraid);
        } else if (typeof mraid.getState === "function") {
          var s = mraid.getState();
          ready = (s === "default" || s === "expanded");
        }
        if (!ready) {
          console.warn("[MRAID] bridge is not ready, attempting open anyway");
        }
        try {
          mraid.open(url);
          return true;
        } catch(err) {
          console.error("[MRAID] open threw", err);
        }
      }
      console.log("Network/browser fallback: ", url);
      return false;
    };
    window.handleClickAction = function(){ return window.handleMraidOpen(); };
    window["openClickThrough"] = window.handleClickAction;

    var lastTapAt = 0;
    window.handleTap = function(event){
      var now = Date.now();
      if (now - lastTapAt < 500) return;
      if (event && (event.type === "touchend" || event.type === "pointerup" || event.type === "click")) {
        lastTapAt = now;
      }
      window.handleClickAction();
    };
  })();
  </script>
</head>
<body>
<script id="creative-data" type="application/octet-stream">`;

  const suffix = `</script>
<script>
/* MRAID Viewability Lifecycle */
(function(){
  var p = [];
  function sync(v){
    var all = Array.prototype.slice.call(document.querySelectorAll("video,audio"));
    if (!v) {
      all.forEach(function(el){
        if (!el.paused) { p.push(el); el.pause(); }
      });
    } else {
      p.forEach(function(el){ el.play().catch(function(){}); });
      p = [];
    }
  }
  function setup(){
    var m = window.mraid;
    if (!m) return;
    if (typeof m.isViewable === "function") {
      try { sync(m.isViewable()); } catch(e) {}
    }
    if (typeof m.addEventListener === "function") {
      try { m.addEventListener("viewableChange", sync); } catch(e) {}
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
</script>
<script>
(async function () {
  try {
    var text = document.getElementById('creative-data').textContent;
    var special = [8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376];
    var bytes = new Uint8Array(text.length), count = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code === 27) code = text.charCodeAt(++i) - 64;
      else if (code > 255) code = special.indexOf(code) + 128;
      bytes[count++] = code;
    }
    var stream = new Blob([bytes.subarray(0, count)]).stream().pipeThrough(new DecompressionStream('gzip'));
    var html = await new Response(stream).text();
    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    console.error('Unable to unpack creative', error);
    document.body.textContent = 'Unable to load this creative in this browser.';
  }
})();
</script></body></html>`;

  // Verify the exact stored payload, including the browser's charset mapping.
  const text = new TextDecoder('windows-1252').decode(payload);
  const mapping = new Map();
  for (let byte = 0; byte < 256; byte++) {
    mapping.set(new TextDecoder('windows-1252').decode(Uint8Array.of(byte)).charCodeAt(0), byte);
  }
  const restored = [];
  for (let i = 0; i < text.length; i++) {
    restored.push(text.charCodeAt(i) === 27 ? text.charCodeAt(++i) - 64 : mapping.get(text.charCodeAt(i)));
  }
  if (!gunzipSync(Buffer.from(restored)).equals(html)) {
    throw new Error('Lossless HTML packing verification failed');
  }
  return Buffer.concat([Buffer.from(prefix), payload, Buffer.from(suffix)]);
}
