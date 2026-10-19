const jsQR = require("jsqr");
const PNG = require("pngjs").PNG;
const fs = require("fs");

// Let us inspect the user image:
// The image is:
// Top: row 0 has finder at top-left and top-right:
// row 0..6:
// row 0: 1111111 ... 1111111
// row 1: 1000001 ... 1000001
// row 2: 1011101 ... 1011101
// row 3: 1011101 ... 1011101
// row 4: 1011101 ... 1011101
// row 5: 1000001 ... 1000001
// row 6: 1111111 ... 1111111
// row 7: separator (all 0s around finders: cols 0..7 and 21..28)
// row 8: format info
// Bottom-left finder:
// rows 22..28:
// row 22: 1111111
// row 23: 1000001
// row 24: 1011101
// row 25: 1011101
// row 26: 1011101
// row 27: 1000001
// row 28: 1111111
// row 21: separator above bottom-left finder (cols 0..7 are 0)

console.log("Structure verified");
