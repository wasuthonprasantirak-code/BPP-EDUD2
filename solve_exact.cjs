const jsQR = require("jsqr");
const PNG = require("pngjs").PNG;
const fs = require("fs");

// Let us inspect the user image directly and extract the exact 29 rows:
// Finders:
// Top-Left: rows 0..6, cols 0..6
// Top-Right: rows 0..6, cols 22..28
// Bottom-Left: rows 22..28, cols 0..6
// Alignment pattern: rows 20..24, cols 20..24 (center at 22,22)

// Let us trace the rows 0..28:
// Let us write out all 29 rows from the image:
const rows = [
  // row 0:
  "11111110000011100111101111111",
  // row 1:
  "10000010010011100111101000001",
  // row 2:
  "10111010001000010010001011101",
  // row 3:
  "10111010110110011000101011101",
  // row 4:
  "10111010110110010110101011101",
  // row 5:
  "10000010010001110010001000001",
  // row 6:
  "11111110101010101010101111111",
  // row 7:
  "00000000111000101001000000000",
  // row 8:
  "11010110111011000100101100111",
  // row 9:
  "01001000110010101011001010011",
  // row 10:
  "00100100101110101000110111010",
  // row 11:
  "10010110001001100100101010110",
  // row 12:
  "01110111100010111001001000100",
  // row 13:
  "00101010101011001010011011111",
  // row 14:
  "11001010110110010111001010111",
  // row 15:
  "00110110100100011010010101111",
  // row 16:
  "01110110101011000101100100100",
  // row 17:
  "00101000110111001101101100010",
  // row 18:
  "01001100101100100101101101111",
  // row 19:
  "00110110100011000100101001000",
  // row 20:
  "00000000101101101111101111010",
  // row 21:
  "00000000001100101000101011000",
  // row 22:
  "11111110111001101010101000100",
  // row 23:
  "10000010111001101000101010100",
  // row 24:
  "10111010101011101111101000100",
  // row 25:
  "10111010101100100000101111100",
  // row 26:
  "10111010001101110101000000000",
  // row 27:
  "10000010010011000110101111011",
  // row 28:
  "11111110010011100110001100010"
];

function testDecode(matrix) {
  const scale = 12;
  const border = 4;
  const size = (29 + border * 2) * scale;
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i+1] = 255;
    png.data[i+2] = 255;
    png.data[i+3] = 255;
  }
  for (let r = 0; r < 29; r++) {
    for (let c = 0; c < 29; c++) {
      if (matrix[r][c] === "1") {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = ((r + border) * scale + dy) * size + ((c + border) * scale + dx);
            png.data[px * 4] = 0;
            png.data[px * 4 + 1] = 0;
            png.data[px * 4 + 2] = 0;
          }
        }
      }
    }
  }
  const res = jsQR(new Uint8ClampedArray(png.data), size, size);
  if (res) {
    console.log(">>> SUCCESS DECODED:", res.data);
    fs.writeFileSync("./public/images/qr-report-form.png", PNG.sync.write(png));
    return res.data;
  }
  console.log("Not yet decoded");
  return null;
}

testDecode(rows);
