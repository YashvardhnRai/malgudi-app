const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcVal]);
}

function makePNG(size, bgR, bgG, bgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw pixel data with M letterform
  const raw = [];
  const cx = size / 2, cy = size / 2;
  const r = size * 0.42; // corner radius for rounded rect background

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Rounded rectangle mask
      const dx = Math.abs(x - cx) - (size / 2 - r);
      const dy = Math.abs(y - cy) - (size / 2 - r);
      const outside = (dx > 0 || dy > 0)
        ? Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) > r
        : false;

      if (outside) {
        // Transparent — use white for PNG (no alpha channel in RGB mode)
        raw.push(255, 255, 255);
        continue;
      }

      // Draw M letterform
      const nx = (x - cx) / (size * 0.38); // normalized -1..1
      const ny = (y - cy) / (size * 0.38);

      // M shape: two vertical bars and a V in the middle
      const barW = 0.16;
      const leftBar  = nx > -1 + 0      && nx < -1 + barW * 2;
      const rightBar = nx > 1 - barW * 2 && nx < 1;
      const inVertRange = ny > -1 && ny < 1;

      // V in the middle: two diagonal strokes meeting at bottom center
      const vThick = 0.13;
      const leftDiag  = Math.abs(nx - (ny - 1) * 0.5 + 0.5) < vThick && ny < 0.2 && nx < 0;
      const rightDiag = Math.abs(nx - (1 - ny) * 0.5 + 0.5) < vThick && ny < 0.2 && nx > 0;

      const isM = inVertRange && (leftBar || rightBar || leftDiag || rightDiag);

      if (isM) {
        raw.push(0xF0, 0x5A, 0x28); // #F05A28 orange
      } else {
        raw.push(bgR, bgG, bgB); // navy bg
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePNG(192, 0x2B, 0x2F, 0x77));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePNG(512, 0x2B, 0x2F, 0x77));
console.log('✓ icon-192.png and icon-512.png created in public/');
