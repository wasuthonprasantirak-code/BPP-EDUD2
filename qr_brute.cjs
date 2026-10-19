// Let us inspect the format info of the QR code:
// Format bits:
// row 8, cols 0..5: rows[8].slice(0, 6)
// (8,7), (8,8), (7,8), (5,8), (4,8), (3,8), (2,8), (1,8), (0,8)
// And top-right: row 8, cols 21..28
// In rows[8]:
// row 8, cols 21..28:
// Let us check all 32 valid format codes in QR:
const formatCodes = [
  { ec: "L", mask: 0, bits: "111011111000100" },
  { ec: "L", mask: 1, bits: "111001011110011" },
  { ec: "L", mask: 2, bits: "111110110101010" },
  { ec: "L", mask: 3, bits: "111100010011101" },
  { ec: "L", mask: 4, bits: "110011000101111" },
  { ec: "L", mask: 5, bits: "110001100011000" },
  { ec: "L", mask: 6, bits: "110110001000001" },
  { ec: "L", mask: 7, bits: "110100101110110" },
  { ec: "M", mask: 0, bits: "101010000010010" },
  { ec: "M", mask: 1, bits: "101000100100101" },
  { ec: "M", mask: 2, bits: "101111001111100" },
  { ec: "M", mask: 3, bits: "101101101001011" },
  { ec: "M", mask: 4, bits: "100010111111001" },
  { ec: "M", mask: 5, bits: "100000011001110" },
  { ec: "M", mask: 6, bits: "100111110010111" },
  { ec: "M", mask: 7, bits: "100101010100000" },
  { ec: "Q", mask: 0, bits: "011010101011111" },
  { ec: "Q", mask: 1, bits: "011000001101000" },
  { ec: "Q", mask: 2, bits: "011111100110001" },
  { ec: "Q", mask: 3, bits: "011101000000110" },
  { ec: "Q", mask: 4, bits: "010010010110100" },
  { ec: "Q", mask: 5, bits: "010000110000011" },
  { ec: "Q", mask: 6, bits: "010111011011010" },
  { ec: "Q", mask: 7, bits: "010101111101101" },
  { ec: "H", mask: 0, bits: "001011010001001" },
  { ec: "H", mask: 1, bits: "001001110111110" },
  { ec: "H", mask: 2, bits: "001110011100111" },
  { ec: "H", mask: 3, bits: "001100111010000" },
  { ec: "H", mask: 4, bits: "000011101100010" },
  { ec: "H", mask: 5, bits: "000001001010101" },
  { ec: "H", mask: 6, bits: "000110100001100" },
  { ec: "H", mask: 7, bits: "000100000111011" }
];

console.log("Format codes check");
