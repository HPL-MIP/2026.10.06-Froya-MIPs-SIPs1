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
  const prefix = `<!doctype html><html><head><meta charset="windows-1252"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Froya</title></head><body><script id="creative-data" type="application/octet-stream">`;
  const suffix = `</script><script>
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
