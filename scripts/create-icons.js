// Gera ícones PNG simples para o PWA sem dependências externas
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 necessário para o formato PNG
function makeCRCTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCRCTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcVal  = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcVal]);
}

function createPNG(size, bgR, bgG, bgB) {
  // Assinatura PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Pixels: fundo colorido com círculo branco central
  const raw = Buffer.alloc((1 + size * 3) * size);
  const cx = size / 2, cy = size / 2, r = size * 0.38;

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      const off = y * (1 + size * 3) + 1 + x * 3;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist < r) {
        // Círculo branco
        raw[off] = 255; raw[off+1] = 255; raw[off+2] = 255;
      } else {
        // Fundo primário
        raw[off] = bgR; raw[off+1] = bgG; raw[off+2] = bgB;
      }
    }
  }

  // Desenha "R$" (pixels manuais simplificados — letra R e cifrão)
  const scale = size / 192;
  const drawPixel = (px, py, R, G, B) => {
    const sx = Math.round(px * scale), sy = Math.round(py * scale);
    if (sx < 0 || sx >= size || sy < 0 || sy >= size) return;
    const off = sy * (1 + size * 3) + 1 + sx * 3;
    raw[off] = R; raw[off+1] = G; raw[off+2] = B;
  };
  const rect = (x1, y1, x2, y2, R, G, B) => {
    for (let py = y1; py <= y2; py++)
      for (let px = x1; px <= x2; px++)
        drawPixel(px, py, R, G, B);
  };

  // "R$" em roxo escuro no círculo branco
  const tx = 55, ty = 68, c1 = 79, c2 = 70, c3 = 229;
  // R
  rect(tx,    ty,    tx+6,  ty+40, c1, c2, c3);
  rect(tx+6,  ty,    tx+18, ty+6,  c1, c2, c3);
  rect(tx+6,  ty+16, tx+18, ty+22, c1, c2, c3);
  rect(tx+18, ty+6,  tx+22, ty+22, c1, c2, c3);
  rect(tx+12, ty+22, tx+22, ty+40, c1, c2, c3);
  // $
  rect(tx+30, ty+4,  tx+50, ty+10, c1, c2, c3);
  rect(tx+26, ty+10, tx+32, ty+18, c1, c2, c3);
  rect(tx+30, ty+18, tx+50, ty+24, c1, c2, c3);
  rect(tx+48, ty+24, tx+54, ty+32, c1, c2, c3);
  rect(tx+30, ty+32, tx+50, ty+38, c1, c2, c3);
  rect(tx+40, ty,    tx+44, ty+42, c1, c2, c3);

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.join(__dirname, '../frontend/icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Roxo primário: #6366f1 = rgb(99, 102, 241)
const R = 99, G = 102, B = 241;

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192, R, G, B));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512, R, G, B));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPNG(180, R, G, B));

console.log('✅ Ícones PWA gerados em frontend/icons/');
