const fs = require('fs');

function parseCSV(text) {
  const result = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      result.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }

  return result;
}

const fileContent = fs.readFileSync('real_sheet_data.csv', 'utf-8');
const rows = parseCSV(fileContent);

const schools = {};

rows.slice(1).forEach(row => {
  const group = row[4] ? row[4].trim() : '';
  const school = row[5] ? row[5].trim() : '';
  
  if (school && (school.startsWith('รร.ตชด.') || school.startsWith('ศกร.ตชด.') || school.startsWith('ศศช.') || school.startsWith('รร.ตขด.'))) {
    if (!schools[school]) {
      schools[school] = {
        name: school,
        group: group
      };
    }
  }
});

console.log(JSON.stringify(Object.values(schools), null, 2));
