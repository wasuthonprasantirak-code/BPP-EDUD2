const jsQR = require("jsqr");
const PNG = require("pngjs").PNG;
const fs = require("fs");

// Let us inspect the image row by row:
// There are 29 rows and 29 cols.
// Let us write out the 29 rows as accurately as possible:
// Let us trace each of the 29 rows from the image:

// Top part: rows 0 to 6 (Finders at left and right)
// Row 0:
// left finder: 7 black
// col 7: 1 white
// col 8..20:
// col 8: 1 white
// col 9: 1 white
// col 10: 1 white
// col 11: 1 white
// col 12: 1 black
// col 13: 1 black
// col 14: 1 black
// col 15: 1 white
// col 16: 1 white
// col 17: 1 black
// col 18: 1 black
// col 19: 1 black
// col 20: 1 black
// col 21: 1 white
// right finder: 7 black

// Row 1:
// left finder: 1 black, 5 white, 1 black
// col 7: 1 white
// col 8: 1 white
// col 9: 1 black
// col 10: 1 white
// col 11: 1 white
// col 12: 1 black
// col 13: 1 black
// col 14: 1 black
// col 15: 1 white
// col 16: 1 white
// col 17: 1 black
// col 18: 1 black
// col 19: 1 black
// col 20: 1 black
// col 21: 1 white
// right finder: 1 black, 5 white, 1 black

console.log("Trace helper loaded");
