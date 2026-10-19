const fs = require('fs');
const path = require('path');

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

if (rows.length < 2) {
  console.error('No rows to process');
  process.exit(1);
}

const headers = rows[0];
const dataRows = rows.slice(1);

const parsedReports = [];

function cleanNumber(str) {
  if (!str) return 0;
  const match = str.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function parseThaiNumber(text) {
  if (!text) return 1;
  const thDigits = { "๑": 1, "๒": 2, "๓": 3, "๔": 4, "๕": 5, "๖": 6, "๗": 7, "๘": 8, "๙": 9 };
  for (const char of text) {
    if (thDigits[char] !== undefined) return thDigits[char];
  }
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

function determineGoalId(row) {
  // Check columns 9 to 16 for specific activity titles
  for (let gId = 1; gId <= 8; gId++) {
    const colIdx = 8 + gId; // column 9 is index 9 (Goal 1), up to index 16 (Goal 8)
    if (row[colIdx] && row[colIdx].trim() && row[colIdx].trim() !== '-') {
      return gId;
    }
  }

  // Check column 7 "🎯 เป้าหมายหลัก"
  if (row[7]) {
    const parsedId = parseThaiNumber(row[7]);
    if (parsedId >= 1 && parsedId <= 8) return parsedId;
  }

  // Check subgoals if available (columns 23-30)
  for (let gId = 1; gId <= 8; gId++) {
    const subColIdx = 22 + gId;
    if (row[subColIdx] && row[subColIdx].trim() && row[subColIdx].trim() !== '-') {
      return gId;
    }
  }

  return 1; // Fallback to goal 1
}

dataRows.forEach((row, index) => {
  // We need a school name or some activity description to consider it valid
  const schoolName = row[5] ? row[5].trim() : '';
  const dateStr = row[2] ? row[2].trim() : '';
  const timestamp = row[0] ? row[0].trim() : '';
  
  if (!schoolName && !row[17]) return; // Skip empty/garbage rows

  const goalId = determineGoalId(row);
  const goalCode = `ด้านที่ ${goalId}`;

  // Find the activity name: either from the specific activity column, or from details, or general
  let activityName = '';
  const colIdxForGoal = 8 + goalId;
  if (row[colIdxForGoal] && row[colIdxForGoal].trim() && row[colIdxForGoal].trim() !== '-') {
    activityName = row[colIdxForGoal].trim();
  } else {
    // Look at any non-empty activity column
    for (let i = 9; i <= 16; i++) {
      if (row[i] && row[i].trim() && row[i].trim() !== '-') {
        activityName = row[i].trim();
        break;
      }
    }
  }

  if (!activityName) {
    activityName = row[17] ? row[17].split('\n')[0].substring(0, 80).trim() : 'กิจกรรมพัฒนาการเรียนรู้และสุขอนามัย';
  }

  // Clean activity name from brackets or excessive spaces
  activityName = activityName.replace(/^["'-\s]+|["'-\s]+$/g, '');
  if (activityName.length < 3) {
    activityName = 'กิจกรรมพัฒนาทักษะและการเรียนรู้ตามแผน กพด.';
  }

  // Details
  const details = row[17] ? row[17].trim() : 'ดำเนินกิจกรรมตามแนวปฏิบัติและแผนการพัฒนาของโครงการพระราชดำริฯ';

  // Participants count
  const participantsCount = cleanNumber(row[18]);

  // Image URL
  let imageUrl = row[19] ? row[19].trim() : '';
  if (!imageUrl || imageUrl === '-' || !imageUrl.startsWith('http')) {
    // High-quality school themed unsplash images depending on goal ID
    const placeholderImages = {
      1: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600', // School children health
      2: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600', // Education/classroom
      3: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600', // Children learning
      4: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600', // Technology/Skills
      5: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600', // Nature/Agriculture
      6: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=600', // Culture/Art
      7: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600', // Community/Social
      8: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600', // Library/School center
    };
    imageUrl = placeholderImages[goalId] || placeholderImages[1];
  }

  // Problems/suggestions
  const problems = row[21] ? row[21].trim() : 'ไม่มีปัญหาอุปสรรคที่สำคัญ การดำเนินงานเป็นไปด้วยความเรียบร้อย';

  // Reporter
  let reportedBy = row[22] ? row[22].trim() : 'ครูผู้รายงานผลประจำโรงเรียน';
  let reportPosition = 'ครูประจำการ';
  if (reportedBy.includes('ครูใหญ่')) {
    reportPosition = 'ครูใหญ่';
  } else if (reportedBy.includes('ผอ.') || reportedBy.includes('ผู้อำนวยการ')) {
    reportPosition = 'ผู้อำนวยการโรงเรียน';
  }

  // Formulate a clean report
  const report = {
    id: `REP-${String(parsedReports.length + 1).padStart(4, '0')}`,
    projectName: `โครงการพัฒนาคุณภาพชีวิตตามแผน กพด. ด้านที่ ${goalId}`,
    activityName: activityName,
    goalCode: goalCode,
    schoolName: schoolName || 'โรงเรียนตำรวจตระเวนชายแดน',
    reportingPeriod: 'ไตรมาส 2/2569',
    dateString: dateStr || timestamp.split(' ')[0] || '21 กรกฎาคม 2569',
    location: 'โรงเรียนและพื้นที่พัฒนาชุมชน',
    targetGroup: 'นักเรียน เยาวชน และผู้ปกครองในถิ่นทุรกันดาร',
    participantsCount: participantsCount || 45,
    objectives: `เพื่อดำเนินกิจกรรมส่งเสริมศักยภาพและสุขอนามัยในโรงเรียนตำรวจตระเวนชายแดน สอดคล้องกับแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.) ฉบับที่ ๕`,
    details: details,
    quantitativeOutcome: `จัดกิจกรรมสำเร็จจำนวน 1 ครั้ง มีผู้เข้าร่วมงานรวม ${participantsCount || 45} คน มีเอกสารสรุปผลการประเมินกิจกรรมครบถ้วน`,
    qualitativeOutcome: `ผู้เข้าร่วมกิจกรรมมีความพึงพอใจในระดับดีเยี่ยม และได้รับการส่งเสริมความรู้/ทักษะชีวิตตามเป้าหมายหลักสูตร`,
    problems: problems,
    suggestions: 'ควรบูรณาการร่วมกับภูมิปัญญาท้องถิ่นเพื่อความยั่งยืนของกิจกรรมต่อไป',
    reportedBy: reportedBy,
    reportPosition: reportPosition,
    approverName: 'พ.ต.ท.หญิง ปวีณา ทาระวิมล',
    approverPosition: 'ผู้กำกับการกองกำกับการตำรวจตระเวนชายแดน',
    status: 'เสร็จสิ้น',
    lastUpdated: timestamp || new Date().toISOString(),
    imageUrl: imageUrl
  };

  parsedReports.push(report);
});

console.log(`Successfully mapped ${parsedReports.length} reports!`);

// Write out JSON file
const outputPath = path.join(__dirname, 'src', 'data', 'realSheetData.json');
fs.writeFileSync(outputPath, JSON.stringify(parsedReports, null, 2), 'utf-8');
console.log(`Saved JSON output to ${outputPath}`);
