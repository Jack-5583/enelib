import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

// Simple monotone mark matching the sdij visual language: #161616 square,
// 2px-radius feel (rounded just enough for OS icon masks), white "e" glyph.
function svg(size, radius) {
  const r = radius;
  const fontSize = size * 0.56;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#161616"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="#ffffff" letter-spacing="-1">e</text>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, radius: 40 },
  { file: "icon-512.png", size: 512, radius: 104 },
  { file: "maskable-512.png", size: 512, radius: 0 }, // full-bleed for maskable purpose
  { file: "apple-touch-icon.png", size: 180, radius: 40 },
];

for (const t of targets) {
  const buf = Buffer.from(svg(t.size, t.radius));
  await sharp(buf).png().toFile(`public/icons/${t.file}`);
  console.log("wrote", t.file);
}

// favicon
await sharp(Buffer.from(svg(64, 14))).png().toFile("public/favicon.png");
console.log("wrote favicon.png");
