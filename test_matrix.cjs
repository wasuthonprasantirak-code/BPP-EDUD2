const jsQR = require("jsqr");
const PNG = require("pngjs").PNG;
const fs = require("fs");

// Let us inspect the user image directly.
// The image has 29 rows and 29 columns:
// Finder top-left (0..6, 0..6), Finder top-right (0..6, 22..28), Finder bottom-left (22..28, 0..6).
// Alignment pattern: (20..24, 20..24)

// Let us look at format bits:
// Format bits: around top-left finder:
// (8,0)..(8,8) and (8,8)..(0,8)
// Top-right: row 8, cols 21..28
// Bottom-left: col 8, rows 21..28

// In the user image:
// Row 8:
// col 0..6: ##.####
// col 7: .
// col 8: #
// col 9..20:
// col 21..28:
