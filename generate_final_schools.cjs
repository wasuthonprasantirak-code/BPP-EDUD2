const fs = require('fs');

// Mappings for the 53 schools
const schoolLocations = {
  // กก.ตชด. 21 (สุรินทร์, บุรีรัมย์)
  "รร.ตชด.บ้านโคกแสลง": { village: "โคกแสลง", villageNo: "7", subdistrict: "ตาเมียง", district: "พนมดงรัก", province: "สุรินทร์" },
  "รร.ตชด.บ้านซำปะโต": { village: "ชำปะโต", villageNo: "3", subdistrict: "อาโพน", district: "บัวเชด", province: "สุรินทร์" },
  "รร.ตชด.พีระยานุเคราะห์ฯ 2": { village: "จารพัต", villageNo: "6", subdistrict: "จารพัต", district: "ศีขรภูมิ", province: "สุรินทร์" },
  "รร.ตชด.บ้านรุน": { village: "รุน", villageNo: "4", subdistrict: "บัวเชด", district: "บัวเชด", province: "สุรินทร์" },
  "รร.ตชด.บ้านตาตุม": { village: "ตาตุม", villageNo: "1", subdistrict: "ตาตุม", district: "สังขะ", province: "สุรินทร์" },
  "รร.ตชด.บ้านตาแตรว": { village: "ตาแตรว", villageNo: "2", subdistrict: "เทพรักษา", district: "สังขะ", province: "สุรินทร์" },
  "รร.ตชด.ท่านผู้หญิงสุประภาดา เกษมสันต์": { village: "ตะเกียด", villageNo: "10", subdistrict: "ตะเคียน", district: "กาบเชิง", province: "สุรินทร์" },
  "รร.ตชด.ชมรม 9สมาคมจีนแห่งประเทศไทย": { village: "ขวาง", villageNo: "3", subdistrict: "ห้วยยาง", district: "บ้านกรวด", province: "บุรีรัมย์" },
  "ศกร.ตชด.ทรัพย์ทรายทอง": { village: "ทรัพย์ทรายทอง", villageNo: "9", subdistrict: "ป่าก่อ", district: "ละหานทราย", province: "บุรีรัมย์" },

  // กก.ตชด. 22 (อุบลราชธานี, ยโสธร, อำนาจเจริญ, ศรีสะเกษ)
  "รร.ตชด.บรรจบพันบ้านปากลา": { village: "ปากลา", villageNo: "5", subdistrict: "นาโพธิ์กลาง", district: "โขงเจียม", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านตาเอ็ม": { village: "ตาเอ็ม", villageNo: "8", subdistrict: "น้ำใหล", district: "นาจะหลวย", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านคำสะอาด": { village: "คำสะอาด", villageNo: "4", subdistrict: "คำสะอาด", district: "สว่างวีระวงศ์", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านท่าแสนคูณ": { village: "ท่าแสนคูณ", villageNo: "5", subdistrict: "เขมราฐ", district: "เขมราฐ", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านแก่งศรีโคตร": { village: "แก่งศรีโคตร", villageNo: "3", subdistrict: "โนนก่อ", district: "สิรินธร", province: "อุบลราชธานี" },
  "รร.ตชด.ศ.ดร.เนวิน สคริมชอว์": { village: "โคกสี", villageNo: "1", subdistrict: "โคกสี", district: "บุณฑริก", province: "อุบลราชธานี" },
  "ศกร.ตชด.ชุมชนป่าหญ้าคา": { village: "ป่าหญ้าคา", villageNo: "6", subdistrict: "โนนก่อ", district: "สิรินธร", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านหนองบัวพัฒนา": { village: "หนองบัวพัฒนา", villageNo: "7", subdistrict: "โขงเจียม", district: "โขงเจียม", province: "อุบลราชธานี" },
  "รร.ตชด.พิทักษ์ปัญญา": { village: "โพนแพง", villageNo: "13", subdistrict: "โพนแพง", district: "บุณฑริก", province: "อุบลราชธานี" },
  "รร.ตชด.เอไอเอ ประเทศไทย (บ้านบ๋าฮี)": { village: "บ๋าฮี", villageNo: "2", subdistrict: "หนองแสงใหญ่", district: "โขงเจียม", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านศรีสวัสดิ์": { village: "ศรีสวัสดิ์", villageNo: "7", subdistrict: "ศรีแก้ว", district: "เลิงนกทา", province: "ยโสธร" },
  "รร.ตชด.บ้านห้วยฆ้อง": { village: "ห้วยฆ้อง", villageNo: "6", subdistrict: "ป่าก่อ", district: "ชานุมาน", province: "อำนาจเจริญ" },
  "รร.ตชด.บ้านภูดานกอย": { village: "ภูดานกอย", villageNo: "8", subdistrict: "คำโพน", district: "ปทุมราชวงศา", province: "อำนาจเจริญ" },
  "รร.ตชด.ปูนอินทรี 50 ปี (บ้านห้วยกระแสน)": { village: "ห้วยกระแสน", villageNo: "8", subdistrict: "ห้วยไผ่", district: "โขงเจียม", province: "อุบลราชธานี" },
  "รร.ตชด.บ้านหนองใหญ่": { village: "หนองใหญ่", villageNo: "10", subdistrict: "รุง", district: "กันทรลักษ์", province: "ศรีสะเกษ" },

  // กก.ตชด. 23 (มุกดาหาร, นครพนม, สกลนคร)
  "รร.ตชด.ช่างกลปทุมวันอนุสรณ์ 8": { village: "วังศรีทอง", villageNo: "11", subdistrict: "คำป่าหลาย", district: "เมืองมุกดาหาร", province: "มุกดาหาร" },
  "รร.ตชด.บ้านหาดทรายเพ": { village: "หาดทรายเพ", villageNo: "5", subdistrict: "หนองแวง", district: "บ้านแพง", province: "นครพนม" },
  "รร.ตชด.ศ.พญ.จินดาพาฯ": { village: "หัวหาด", villageNo: "3", subdistrict: "นาทม", district: "นาทม", province: "นครพนม" },
  "รร.ตชด.บ้านนาสามัคคี": { village: "นาสามัคคี", villageNo: "5", subdistrict: "นาทม", district: "นาทม", province: "นครพนม" },
  "รร.ตชด.คอนราดเฮงเค็ล": { village: "หนองดู่", villageNo: "2", subdistrict: "นาใน", district: "โพนสวรรค์", province: "นครพนม" },
  "รร.ตชด.บ้านนากระเสริม": { village: "นากระเสริม", villageNo: "3", subdistrict: "หนองสนม", district: "วานรนิวาส", province: "สกลนคร" },
  "รร.ตขด.บ้านปากห้วยม่วง": { village: "ปากห้วยม่วง", villageNo: "4", subdistrict: "นาเข", district: "บ้านแพง", province: "นครพนม" },
  "รร.ตชด.บ้านปากห้วยม่วง": { village: "ปากห้วยม่วง", villageNo: "4", subdistrict: "นาเข", district: "บ้านแพง", province: "นครพนม" },
  "รร.ตชด.ค็อกนิสไทย ฯ": { village: "ค็อกนิสไทย", villageNo: "1", subdistrict: "แมดนาท่ม", district: "โคกศรีสุพรรณ", province: "สกลนคร" },
  "รร.ตชด.ชูทิศวิทยา": { village: "หนองแคน", villageNo: "9", subdistrict: "นาโสก", district: "เมืองมุกดาหาร", province: "มุกดาหาร" },
  "รร.ตชด.การท่าอากาศยาน": { village: "วังอ่าง", villageNo: "7", subdistrict: "นาตงวัฒนา", district: "โพนนาแก้ว", province: "สกลนคร" },
  "ศกร.ตชด.ใต้ร่มพระบารมีฯ": { village: "ใต้ร่มพระบารมี", villageNo: "10", subdistrict: "ปทุมวาปี", district: "ส่องดาว", province: "สกลนคร" },

  // กก.ตชด. 24 (เลย, บึงกาฬ, อุดรธานี, หนองคาย)
  "รร.ตชด.บ้านเมืองทอง": { village: "เมืองทอง", villageNo: "2", subdistrict: "โนนป่าซาง", district: "ผาขาว", province: "เลย" },
  "รร.ตชด.บ้านนาชมภู": { village: "นาชมภู", villageNo: "8", subdistrict: "บ้านต้อง", district: "เซกา", province: "บึงกาฬ" },
  "รร.ตชด.บ้านเทพภูเงิน": { village: "เทพภูเงิน", villageNo: "3", subdistrict: "น้ำโสม", district: "น้ำโสม", province: "อุดรธานี" },
  "รร.ตชด.ไปรษณีย์ไทย(บ้านห้วยหมากหล่ำ)": { village: "ห้วยหมากหล่ำ", villageNo: "6", subdistrict: "ทมนางาม", district: "โนนสะอาด", province: "อุดรธานี" },
  "รร.ตชด.เฉลิมราษฎร์บำรุง": { village: "ด่านศรีสุข", villageNo: "5", subdistrict: "ด่านศรีสุข", district: "โพธิ์ตาก", province: "หนองคาย" },
  "รร.ตชด.บ้านห้วยเป้า": { village: "ห้วยเป้า", villageNo: "5", subdistrict: "ปากชม", district: "ปากชม", province: "เลย" },
  "รร.ตชด.บ้านห้วยเวียงงาม": { village: "ห้วยเวียงงาม", villageNo: "4", subdistrict: "นายูง", district: "นายูง", province: "อุดรธานี" },
  "รร.ตชด.ฮิลมาร์พาเบิล": { village: "เชียงดี", villageNo: "3", subdistrict: "พะทาย", district: "ท่าอุเทน", province: "นครพนม" },
  "รร.ตชด.บ้านนานกปีด": { village: "นานกปีด", villageNo: "6", subdistrict: "ห้วยบ่อซืน", district: "ปากชม", province: "เลย" },
  "รร.ตชด.บ้านหนองแคน": { village: "หนองแคน", villageNo: "9", subdistrict: "นาด้วง", district: "นาด้วง", province: "เลย" },
  "รร.ตชด.บ้านวังชมภู": { village: "วังชมภู", villageNo: "8", subdistrict: "โนนป่าซาง", district: "ผาขาว", province: "เลย" },
  "รร.ตชด.บ้านนาปอ": { village: "นาปอ", villageNo: "4", subdistrict: "แสงภา", district: "นาแห้ว", province: "เลย" },
  "รร.ตชด.บ้านหมันขาว": { village: "หมันขาว", villageNo: "4", subdistrict: "กกสะทอน", district: "ด่านซ้าย", province: "เลย" },
  "รร.ตชด.บ้านห้วยดอกไม้": { village: "ห้วยดอกไม้", villageNo: "4", subdistrict: "วิศิษฐ์", district: "เมืองบึงกาฬ", province: "บึงกาฬ" },
  "รร.ตชด.บ้านหนองตะไก้": { village: "หนองตะไก้", villageNo: "7", subdistrict: "หนองวัวซอ", district: "หนองวัวซอ", province: "อุดรธานี" },
  "รร.ตชด.บ้านนาแวง": { village: "นาแวง", villageNo: "4", subdistrict: "นาดี", district: "ด่านซ้าย", province: "เลย" },
  "รร.ตชด.บ้านคำชมภู": { village: "คำชมภู", villageNo: "10", subdistrict: "บ้านต้อง", district: "เซกา", province: "บึงกาฬ" },
  "รร.ตชด.บ้านไทยเสรี": { village: "ไทยเสรี", villageNo: "5", subdistrict: "โคกขมิ้น", district: "วังสะพุง", province: "เลย" }
};

const groupMappings = {
  "กก.ตชด.21": "กองกำกับการตำรวจตระเวนชายแดนที่ 21",
  "กก.ตชด.22": "กองกำกับการตำรวจตระเวนชายแดนที่ 22",
  "กก.ตชด.23": "กองกำกับการตำรวจตระเวนชายแดนที่ 23",
  "กก.ตชด.24": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
};

const fileContent = fs.readFileSync('real_sheet_data.csv', 'utf-8');
const rows = fileContent.split('\n').map(r => r.split(','));

const uniqueSchools = {};

// Parse unique schools from real sheet data
const getSchoolsGroupsContent = fs.readFileSync('get_schools_groups.cjs', 'utf-8');
// Let's run a manual check by parsing CSV again
const schoolsSet = new Set();
const parsedSchools = [];

const csvRows = require('./get_schools_groups.cjs');

// We have the raw list from the output of get_schools_groups.cjs
const rawSchoolsList = [
  { "name": "รร.ตชด.ค็อกนิสไทย ฯ", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านนากระเสริม", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านนาสามัคคี", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.การท่าอากาศยาน", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.คอนราดเฮงเค็ล", "group": "กก.ตชด.23" },
  { "name": "รร.ตขด.บ้านปากห้วยม่วง", "group": "กก.ตชด.23" },
  { "name": "ศกร.ตชด.ใต้ร่มพระบารมีฯ", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.ช่างกลปทุมวันอนุสรณ์ 8", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านหาดทรายเพ", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านห้วยเวียงงาม", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านนาแวง", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.ชูทิศวิทยา", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.ศ.พญ.จินดาภาฯ", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านปากห้วยม่วง", "group": "กก.ตชด.23" },
  { "name": "รร.ตชด.บ้านเมืองทอง", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านห้วยเป้า", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านนาชมภู", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านนานกปีด", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านคำชมภู", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านหนองแคน", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.ศ.ดร.เนวิน สคริมชอว์", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านแก่งศรีโคตร", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.ฮิลมาร์พาเบิล", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านนาปอ", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านวังชมภู", "group": "กก.ตชด.24" },
  { "name": "ศกร.ตชด.ทรัพย์ทรายทอง", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านหนองตะไก้", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.ท่านผู้หญิงสุประภาดา เกษมสันต์", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านตาตุม", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านรุน", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.ชมรม 9สมาคมจีนแห่งประเทศไทย", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.เฉลิมราษฎร์บำรุง", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านซำปะโต", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.พีระยานุเคราะห์ฯ 2", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านศรีสวัสดิ์", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านโคกแสลง", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านหนองใหญ่", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.เอไอเอ ประเทศไทย (บ้านบ๋าฮี)", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านเทพภูเงิน", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.บ้านตาแตรว", "group": "กก.ตชด.21" },
  { "name": "รร.ตชด.บ้านห้วยดอกไม้", "group": "กก.ตชด.24" },
  { "name": "ศกร.ตชด.ชุมชนป่าหญ้าคา", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บรรจบพันบ้านปากลา", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.ปูนอินทรี 50 ปี (บ้านห้วยกระแสน)", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.พิทักษ์ปัญญา", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านห้วยฆ้อง", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านภูดานกอย", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านตาเอ็ม", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านหนองบัวพัฒนา", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านคำสะอาด", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านท่าแสนคูณ", "group": "กก.ตชด.22" },
  { "name": "รร.ตชด.บ้านไทยเสรี", "group": "กก.ตชด.24" },
  { "name": "รร.ตชด.ไปรษณีย์ไทย(บ้านห้วยหมากหล่ำ)", "group": "กก.ตชด.24" }
];

const targetSchools = [];
const seenNames = new Set();

rawSchoolsList.forEach((sch, index) => {
  if (seenNames.has(sch.name)) return;
  seenNames.add(sch.name);

  const loc = schoolLocations[sch.name] || {
    village: sch.name.replace(/รร\.ตชด\.|ศกร\.ตชด\.|ศศช\.|รร\.ตขด\./, '').replace('บ้าน', ''),
    villageNo: "1",
    subdistrict: "ตระเวนชายแดน",
    district: "เมือง",
    province: "ภาคตะวันออกเฉียงเหนือ"
  };

  const groupName = groupMappings[sch.group] || "กองกำกับการตำรวจตระเวนชายแดน";

  targetSchools.push({
    id: `SCH-${String(targetSchools.length + 1).padStart(3, '0')}`,
    name: sch.name,
    village: loc.village,
    villageNo: loc.villageNo,
    subdistrict: loc.subdistrict,
    district: loc.district,
    province: loc.province,
    groupName: groupName
  });
});

console.log(`Generated database of ${targetSchools.length} target schools!`);

// Write to schoolsData.ts
const tsContent = `export interface TargetSchool {
  id: string;
  name: string;
  village: string;
  villageNo: string;
  subdistrict: string;
  district: string;
  province: string;
  groupName: string; // กองกำกับการตำรวจตระเวนชายแดน (หรือ สพฐ./ศศช.)
}

export const OFFICIAL_TARGET_SCHOOLS: TargetSchool[] = ${JSON.stringify(targetSchools, null, 2)};

export const isSchoolMatch = (queryName: string, targetName: string): boolean => {
  if (!queryName || !targetName) return false;
  const clean1 = queryName.replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\./g, '').trim();
  const clean2 = targetName.replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\./g, '').trim();
  return clean1.includes(clean2) || clean2.includes(clean1);
};

export const getPrincipalBySchoolName = (schoolName: string): string => {
  return "ครูใหญ่โรงเรียนตำรวจตระเวนชายแดน";
};

export const getSchoolAddressBySchoolName = (schoolName: string): string => {
  if (!schoolName) return "ไม่ระบุที่อยู่";
  const sch = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (sch) {
    return \`หมู่ \${sch.villageNo || "1"} บ้าน\${sch.village || sch.name.replace(/รร.ตชด.|โรงเรียนตำรวจตระเวนชายแดน|ศกร.ตชด.|ศศช./g, '')} ต.\${sch.subdistrict} อ.\${sch.district} จ.\${sch.province}\`;
  }
  return "สังกัดกองบัญชาการตำรวจตระเวนชายแดน";
};

export const getSchoolGpsBySchoolName = (schoolName: string): [number, number] | null => {
  if (!schoolName) return null;
  const sch = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (sch) {
    if (sch.province.includes("สุรินทร์")) return [14.88, 103.49];
    if (sch.province.includes("บุรีรัมย์")) return [15.00, 103.10];
    if (sch.province.includes("อุบลราชธานี")) return [15.23, 104.85];
    if (sch.province.includes("อำนาจเจริญ")) return [15.86, 104.62];
    if (sch.province.includes("ยโสธร")) return [15.79, 104.14];
    if (sch.province.includes("ศรีสะเกษ")) return [15.11, 104.32];
    if (sch.province.includes("สกลนคร")) return [17.16, 104.14];
    if (sch.province.includes("มุกดาหาร")) return [16.54, 104.72];
    if (sch.province.includes("นครพนม")) return [17.39, 104.76];
    if (sch.province.includes("อุดรธานี")) return [17.41, 102.78];
    if (sch.province.includes("เลย")) return [17.48, 101.72];
    if (sch.province.includes("หนองคาย")) return [17.87, 102.74];
    if (sch.province.includes("บึงกาฬ")) return [18.36, 103.65];
  }
  return [15.23, 104.85];
};
`;

fs.writeFileSync('src/data/schoolsData.ts', tsContent, 'utf-8');
console.log("Wrote schools to src/data/schoolsData.ts successfully!");
