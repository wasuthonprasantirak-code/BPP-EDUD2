const jsQR = require("jsqr");
const PNG = require("pngjs").PNG;
const fs = require("fs");

// Let us inspect the image modules directly:
// Notice that the image is a screenshot / export of a QR Code.
// 29 rows by 29 columns.
// Let us write out the matrix:
// 1 = black, 0 = white

const m = [
  // 0
  "11111110000011100111101111111",
  // 1
  "10000010010011100111101000001",
  // 2
  "10111010001000010010001011101",
  // 3
  "10111010110110011000101011101",
  // 4
  "10111010110110010110101011101",
  // 5
  "10000010010001110010001000001",
  // 6
  "11111110101010101010101111111",
  // 7
  "00000000111000101001000000000",
  // 8
  "11010110111011000100101100111",
  // 9
  "11001000110010101011001010011",
  // 10
  "01000100101110101000110111010",
  // 11
  "01010110001001100100101010110",
  // 12
  "00110111100010111001001000100",
  // 13
  "10001010101011001010011011111",
  // 14
  "11110110110110010111001010111",
  // 15
  "10101110100100011010010101111",
  // 16
  "00100010101011000101100100100",
  // 17
  "11001000110111001101101100010",
  // 18
  "01001100101100100101101101111",
  // 19
  "00000000100011000100101001000",
  // 20
  "11111110101101101111101111010",
  // 21
  "10000010001100101000101011000",
  // 22
  "10111010111001101111101000100",
  // 23
  "10111010111001101000101010100",
  // 24
  "10111010101011101111101000100",
  // 25
  "10111010101100100000101111100",
  // 26
  "10000010001101110101000000000",
  // 27
  "11111110010011000110101111011",
  // 28
  "00000000010011100110001100010"
];

console.log("Lines:", m.length);
m.forEach((row, idx) => {
  if (row.length !== 29) console.log("Row", idx, "length:", row.length);
});

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
  return null;
}

testDecode(m);
