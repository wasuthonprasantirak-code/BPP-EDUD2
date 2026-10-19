export interface TargetSchool {
  id: string;
  name: string;
  village: string;
  villageNo: string;
  subdistrict: string;
  district: string;
  province: string;
  groupName: string; // กองกำกับการตำรวจตระเวนชายแดน (กก.ตชด.๒๑, ๒๒, ๒๓, ๒๔)
  latitude?: string;
  longitude?: string;
}

export const BASE_OFFICIAL_TARGET_SCHOOLS: TargetSchool[] = [
  // กก.ตชด.๒๑ (สุรินทร์, บุรีรัมย์)
  {
    "id": "SCH-001",
    "name": "รร.ตชด.บ้านโคกแสลง",
    "village": "โคกแสลง",
    "villageNo": "7",
    "subdistrict": "ตาเมียง",
    "district": "พนมดงรัก",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-002",
    "name": "รร.ตชด.บ้านซำปะโต",
    "village": "ซำปะโต",
    "villageNo": "-",
    "subdistrict": "อาโพน",
    "district": "บัวเชด",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-003",
    "name": "รร.ตชด.พีระยานุเคราะห์ฯ 2",
    "village": "ปรือ",
    "villageNo": "6",
    "subdistrict": "ปรือ",
    "district": "ปราสาท",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-004",
    "name": "รร.ตชด.บ้านรุน",
    "village": "บ้านรุน",
    "villageNo": "-",
    "subdistrict": "อาโพน",
    "district": "บัวเชด",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-005",
    "name": "รร.ตชด.บ้านตาตุม",
    "village": "ตาตุม",
    "villageNo": "13",
    "subdistrict": "ตาตุม",
    "district": "สังขะ",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-006",
    "name": "รร.ตชด.บ้านตาแตรว",
    "village": "ตาแตรว",
    "villageNo": "2",
    "subdistrict": "เทพรักษา",
    "district": "สังขะ",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-007",
    "name": "รร.ตชด.ชมรม 9 สมาคมจีนแห่งประเทศไทยอุปถัมภ์",
    "village": "ละหานทราย",
    "villageNo": "6",
    "subdistrict": "ละหานทราย",
    "district": "ละหานทราย",
    "province": "บุรีรัมย์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-008",
    "name": "รร.ตชด.ท่านผู้หญิงสุประภาดา เกษมสันต์",
    "village": "ตะเคียน",
    "villageNo": "114",
    "subdistrict": "ตะเคียน",
    "district": "กาบเชิง",
    "province": "สุรินทร์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },
  {
    "id": "SCH-009",
    "name": "ศกร.ตชด.ทรัพย์ทรายทอง",
    "village": "ทรัพย์ทรายทอง",
    "villageNo": "11",
    "subdistrict": "โคกมะม่วง",
    "district": "ปะคำ",
    "province": "บุรีรัมย์",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 21"
  },

  // กก.ตชด.๒๒ (อุบลราชธานี, อำนาจเจริญ, ยโสธร, ศรีสะเกษ)
  {
    "id": "SCH-010",
    "name": "รร.ตชด.บรรจบพันบ้านปากลา",
    "village": "ปากลา",
    "villageNo": "-",
    "subdistrict": "นาโพธิ์กลาง",
    "district": "โขงเจียม",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-011",
    "name": "รร.ตชด.บ้านตาเอ็ม",
    "village": "ตาเอ็ม",
    "villageNo": "7",
    "subdistrict": "ตาเกา",
    "district": "น้ำขุ่น",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-012",
    "name": "รร.ตชด.บ้านคำสะอาด",
    "village": "คำสะอาด",
    "villageNo": "4",
    "subdistrict": "ยาง",
    "district": "น้ำยืน",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-013",
    "name": "รร.ตชด.บ้านท่าแสนคูณ",
    "village": "ท่าแสนคูณ",
    "villageNo": "13",
    "subdistrict": "โดมประดิษฐ์",
    "district": "น้ำยืน",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-014",
    "name": "รร.ตชด.บ้านศรีสวัสดิ์",
    "village": "ศรีสวัสดิ์",
    "villageNo": "5",
    "subdistrict": "ศรีแก้ว",
    "district": "ไทยเจริญ",
    "province": "ยโสธร",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-015",
    "name": "รร.ตชด.บ้านห้วยฆ้อง",
    "village": "ห้วยฆ้อง",
    "villageNo": "5",
    "subdistrict": "ป่าก่อ",
    "district": "ชานุมาน",
    "province": "อำนาจเจริญ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-016",
    "name": "รร.ตชด.บ้านแก่งศรีโคตร",
    "village": "แก่งศรีโคตร",
    "villageNo": "3",
    "subdistrict": "โนนก่อ",
    "district": "สิรินธร",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-017",
    "name": "รร.ตชด.ศาสตราจารย์ ดอกเตอร์เนวิน สคริมชอว์",
    "village": "ป่าไม้",
    "villageNo": "-",
    "subdistrict": "คอแลน",
    "district": "บุณฑริก",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-018",
    "name": "รร.ตชด.บ้านหนองใหญ่",
    "village": "หนองใหญ่",
    "villageNo": "11",
    "subdistrict": "รุง",
    "district": "กันทรลักษ์",
    "province": "ศรีสะเกษ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-019",
    "name": "ศกร.ตชด.ชุมชนป่าหญ้าคา",
    "village": "ป่าหญ้าคา",
    "villageNo": "9",
    "subdistrict": "โนนก่อ",
    "district": "สิรินธร",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-020",
    "name": "รร.ตชด.บ้านหนองบัวพัฒนา",
    "village": "หนองบัว",
    "villageNo": "14",
    "subdistrict": "โดมประดิษฐ์",
    "district": "น้ำยืน",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-021",
    "name": "รร.ตชด.บ้านภูดานกอย",
    "village": "ภูดานกอย",
    "villageNo": "6",
    "subdistrict": "คำบง",
    "district": "ปทุมราชวงศา",
    "province": "อำนาจเจริญ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-022",
    "name": "รร.ตชด.พิทักษ์ปัญญา",
    "village": "ดงตาหวาน",
    "villageNo": "13",
    "subdistrict": "แก่งเค็ง",
    "district": "กุดข้าวปุ้น",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-023",
    "name": "รร.ตชด.เอไอเอ ประเทศไทย (บ้านบ๋าฮี)",
    "village": "บ๋าฮี",
    "villageNo": "8",
    "subdistrict": "หนองผือ",
    "district": "เขมราฐ",
    "province": "อุบลราชธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },
  {
    "id": "SCH-024",
    "name": "รร.ตชด.ปูนอินทรี 50 ปี (บ้านห้วยกระแสน)",
    "village": "ห้วยกระแสน",
    "villageNo": "7",
    "subdistrict": "ป่าก่อ",
    "district": "ชานุมาน",
    "province": "อำนาจเจริญ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 22"
  },

  // กก.ตชด.๒๓ (นครพนม, สกลนคร, มุกดาหาร)
  {
    "id": "SCH-025",
    "name": "รร.ตชด.ชูทิศวิทยา",
    "village": "หนองเทา",
    "villageNo": "-",
    "subdistrict": "หนองเทา",
    "district": "ท่าอุเทน",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-026",
    "name": "รร.ตชด.ช่างกลปทุมวันอนุสรณ์ 8",
    "village": "ดอนเตย",
    "villageNo": "6",
    "subdistrict": "ดอนเตย",
    "district": "นาทม",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-027",
    "name": "รร.ตชด.บ้านหาดทรายเพ",
    "village": "หาดทรายเพ",
    "villageNo": "5",
    "subdistrict": "หนองเทา",
    "district": "ท่าอุเทน",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-028",
    "name": "รร.ตชด.ศ.ดร.พญ.จินดาพาฯ",
    "village": "ยอดชาด",
    "villageNo": "2",
    "subdistrict": "หนองเทา",
    "district": "ท่าอุเทน",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-029",
    "name": "รร.ตชด.บ้านนาสามัคคี",
    "village": "นาสามัคคี",
    "villageNo": "6",
    "subdistrict": "นาทม",
    "district": "นาทม",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-030",
    "name": "รร.ตชด.คอนราดเฮงเค็ล",
    "village": "ท่าสะอาด",
    "villageNo": "6",
    "subdistrict": "นาใน",
    "district": "โพนสวรรค์",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-031",
    "name": "รร.ตชด.ค็อกนิสไทยฯ",
    "village": "ค็อกนิสไทย",
    "villageNo": "1",
    "subdistrict": "แมดนาท่ม",
    "district": "โคกศรีสุพรรณ",
    "province": "สกลนคร",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-032",
    "name": "รร.ตชด.การท่าอากาศยานฯ",
    "village": "คิ้ว",
    "villageNo": "7",
    "subdistrict": "กกตูม",
    "district": "ดงหลวง",
    "province": "มุกดาหาร",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-033",
    "name": "รร.ตชด.บ้านนากระเสริม",
    "village": "นากระเสริม",
    "villageNo": "10",
    "subdistrict": "พนอม",
    "district": "ท่าอุเทน",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-034",
    "name": "รร.ตชด.บ้านปากห้วยม่วง",
    "village": "ปากห้วยม่วง",
    "villageNo": "4",
    "subdistrict": "นาเข",
    "district": "บ้านแพง",
    "province": "นครพนม",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },
  {
    "id": "SCH-035",
    "name": "ศกร.ตชด.ใต้ร่มพระบารมี (ธนาคารอาคารสงเคราะห์อุปถัมภ์)",
    "village": "บ้านเหล่า",
    "villageNo": "-",
    "subdistrict": "บ้านเหล่า",
    "district": "คำชะอี",
    "province": "มุกดาหาร",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 23"
  },

  // กก.ตชด.๒๔ (เลย, อุดรธานี, บึงกาฬ)
  {
    "id": "SCH-036",
    "name": "รร.ตชด.เฉลิมราษฎร์บำรุง",
    "village": "น้ำเย็น",
    "villageNo": "8",
    "subdistrict": "ด่านซ้าย",
    "district": "ด่านซ้าย",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-037",
    "name": "รร.ตชด.บ้านห้วยเป้า",
    "village": "ห้วยเป้า",
    "villageNo": "5",
    "subdistrict": "ปากชม",
    "district": "ปากชม",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-038",
    "name": "รร.ตชด.บ้านห้วยเวียงงาม",
    "village": "ห้วยเวียงงาม",
    "villageNo": "5",
    "subdistrict": "เขาหลวง",
    "district": "วังสะพุง",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-039",
    "name": "รร.ตชด.ฮิลมาร์พาเบิล",
    "village": "เหมืองทอง",
    "villageNo": "9",
    "subdistrict": "เชียงกลม",
    "district": "ปากชม",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-040",
    "name": "รร.ตชด.บ้านห้วยดอกไม้",
    "village": "ห้วยดอกไม้",
    "villageNo": "4",
    "subdistrict": "วิศิษฐ์",
    "district": "เมืองบึงกาฬ",
    "province": "บึงกาฬ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-041",
    "name": "รร.ตชด.บ้านนานกปีด",
    "village": "นานกปีด",
    "villageNo": "5",
    "subdistrict": "ปากชม",
    "district": "ปากชม",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-042",
    "name": "รร.ตชด.บ้านหนองแคน",
    "village": "หนองแคน",
    "villageNo": "-",
    "subdistrict": "นาด้วง",
    "district": "นาด้วง",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-043",
    "name": "รร.ตชด.บ้านเมืองทอง",
    "village": "เมืองทอง",
    "villageNo": "11",
    "subdistrict": "โนนทอง",
    "district": "นายูง",
    "province": "อุดรธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-044",
    "name": "รร.ตชด.บ้านวังชมภู",
    "village": "วังชมภู",
    "villageNo": "-",
    "subdistrict": "ทรัพย์ไพวัลย์",
    "district": "เอราวัณ",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-045",
    "name": "รร.ตชด.บ้านหนองตะไก้",
    "village": "หนองตะไก้",
    "villageNo": "-",
    "subdistrict": "โป่งเปื่อย",
    "district": "เมืองบึงกาฬ",
    "province": "บึงกาฬ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-046",
    "name": "รร.ตชด.บ้านนาแวง",
    "village": "นาแวง",
    "villageNo": "-",
    "subdistrict": "นาสวรรค์",
    "district": "เมืองบึงกาฬ",
    "province": "บึงกาฬ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-047",
    "name": "รร.ตชด.บ้านนาชมภู",
    "village": "นาชมภู",
    "villageNo": "-",
    "subdistrict": "บ้านก้อง",
    "district": "นายูง",
    "province": "อุดรธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-048",
    "name": "รร.ตชด.บ้านนาปอ",
    "village": "นาปอ",
    "villageNo": "-",
    "subdistrict": "แสงภา",
    "district": "นาแห้ว",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-049",
    "name": "รร.ตชด.บ้านเทพภูเงิน",
    "village": "เทพภูเงิน",
    "villageNo": "-",
    "subdistrict": "น้ำโสม",
    "district": "น้ำโสม",
    "province": "อุดรธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-050",
    "name": "รร.ตชด.บ้านหมันขาว",
    "village": "หมันขาว",
    "villageNo": "-",
    "subdistrict": "กกสะทอน",
    "district": "ด่านซ้าย",
    "province": "เลย",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-051",
    "name": "รร.ตชด.บ้านคำชมภู",
    "village": "คำชมภู",
    "villageNo": "-",
    "subdistrict": "บ้านต้อง",
    "district": "เซกา",
    "province": "บึงกาฬ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-052",
    "name": "รร.ตชด.บ้านไทยเสรี",
    "village": "ไทยเสรี",
    "villageNo": "-",
    "subdistrict": "เซกา",
    "district": "เซกา",
    "province": "บึงกาฬ",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  },
  {
    "id": "SCH-053",
    "name": "รร.ตชด.ไปรษณีย์ไทย (บ้านห้วยหมากหล่ำ)",
    "village": "ห้วยหมากหล่ำ",
    "villageNo": "-",
    "subdistrict": "ทมนางาม",
    "district": "โนนสะอาด",
    "province": "อุดรธานี",
    "groupName": "กองกำกับการตำรวจตระเวนชายแดนที่ 24"
  }
];

const cleanCache = new Map<string, string>();
const cleanStrMemo = (str: string): string => {
  const cached = cleanCache.get(str);
  if (cached !== undefined) return cached;
  const res = str
    .replace(/\(.*\)/g, '')
    .replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\.|รร\.|โรงเรียน|ตขด\.|ตชด\./g, '')
    .replace(/ศาสตราจารย์\s*ดอกเตอร์/g, 'ศ.ดร.')
    .replace(/ศาสตราจารย์/g, 'ศ.')
    .replace(/ดอกเตอร์/g, 'ดร.')
    .replace(/แพทย์หญิง/g, 'พญ.')
    .replace(/นายแพทย์/g, 'นพ.')
    .replace(/ศ\.ดร\.พญ\.|ศ\.พญ\.|ดร\.พญ\.|พญ\.|ศ\.ดร\.|ศ\.|ดร\./g, '')
    .replace(/จินดาพา/g, 'จินดาภา')
    .replace(/ชำปะโต/g, 'ซำปะโต')
    .replace(/ฯ/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
  cleanCache.set(str, res);
  return res;
};

const matchCache = new Map<string, boolean>();

export const isSchoolMatch = (queryName: string, targetName: string): boolean => {
  if (!queryName || !targetName) return false;
  const cacheKey = `${queryName}||${targetName}`;
  const cachedResult = matchCache.get(cacheKey);
  if (cachedResult !== undefined) return cachedResult;

  const clean1 = cleanStrMemo(queryName);
  const clean2 = cleanStrMemo(targetName);
  if (!clean1 || !clean2) {
    matchCache.set(cacheKey, false);
    return false;
  }
  if (clean1 === clean2) {
    matchCache.set(cacheKey, true);
    return true;
  }
  if (clean1.length >= 3 && clean2.length >= 3) {
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      matchCache.set(cacheKey, true);
      return true;
    }
  }
  matchCache.set(cacheKey, false);
  return false;
};

export const PRINCIPAL_MAP: { key: string; val: string }[] = [
  { key: "บ้านโคกแสลง", val: "พ.ต.ท.เอกชัย สาคร" },
  { key: "บ้านซำปะโต", val: "พ.ต.ท.ครรชิต พูนวิเชียร" },
  { key: "ซำปะโต", val: "พ.ต.ท.ครรชิต พูนวิเชียร" },
  { key: "บ้านชำปะโต", val: "พ.ต.ท.ครรชิต พูนวิเชียร" },
  { key: "ชำปะโต", val: "พ.ต.ท.ครรชิต พูนวิเชียร" },
  { key: "พีระยานุเคราะห์", val: "พ.ต.ท.อารมณ์ มาลัย" },
  { key: "บ้านรุน", val: "ร.ต.ต.อรรถกร นารัมย์" },
  { key: "บ้านตาตุม", val: "ร.ต.อ.พงษ์ศักดิ์ สาธุรัมย์" },
  { key: "บ้านตาแตรว", val: "ร.ต.อ.พิง พิพัฒนสกุลวงศ์" },
  { key: "9สมาคมจีน", val: "พ.ต.ท.สรกฤช ตะเกิงผล" },
  { key: "9 สมาคมจีน", val: "พ.ต.ท.สรกฤช ตะเกิงผล" },
  { key: "ชมรม 9", val: "พ.ต.ท.สรกฤช ตะเกิงผล" },
  { key: "ท่านผู้หญิงสุประภาดา", val: "ร.ต.ท.อัมพร พิชญ์ประเสริฐ" },
  { key: "ทรัพย์ทรายทอง", val: "พ.ต.ท.ธนาชัย ยางหงษ์" },
  { key: "บรรจบพันบ้านปากลา", val: "ด.ต.โกศล สิงหา" },
  { key: "ปากลา", val: "ด.ต.โกศล สิงหา" },
  { key: "บ้านตาเอ็ม", val: "พ.ต.ท.นิเชต ฤทธิสิทธิ์" },
  { key: "บ้านคำสะอาด", val: "พ.ต.ท.บุญชู พันธ์สว่าง" },
  { key: "คำสะอาด", val: "พ.ต.ท.บุญชู พันธ์สว่าง" },
  { key: "บ้านท่าแสนคูณ", val: "ด.ต.อภิชาติ วิริยะพันธ์" },
  { key: "ท่าแสนคูณ", val: "ด.ต.อภิชาติ วิริยะพันธ์" },
  { key: "บ้านศรีสวัสดิ์", val: "ด.ต.สันจร คิสาลัง" },
  { key: "บ้านห้วยฆ้อง", val: "พ.ต.ท.วัชรพงศ์ สหัสภูริพัฒน์" },
  { key: "บ้านแก่งศรีโคตร", val: "จ.ส.ต.หญิงอุดมศรี ศรประสิทธิ์" },
  { key: "เนวิน", val: "ด.ต.หญิงรุจาภา โกสีย์" },
  { key: "สคริมชอว์", val: "ด.ต.หญิงรุจาภา โกสีย์" },
  { key: "สกิลชอ", val: "ด.ต.หญิงรุจาภา โกสีย์" },
  { key: "บ้านหนองใหญ่", val: "ด.ต.หญิงเรณู ทองเลิศ" },
  { key: "ป่าหญ้าคา", val: "ร.ต.อ.โอภาส แพงคำฮัก" },
  { key: "บ้านหนองบัวพัฒนา", val: "ร.ต.ต.สากล ธิอามาตย์" },
  { key: "หนองบัวพัฒนา", val: "ร.ต.ต.สากล ธิอามาตย์" },
  { key: "บ้านภูดานกอย", val: "พ.ต.ท.ประเสริฐ บุญศรี" },
  { key: "พิทักษ์ปัญญา", val: "ด.ต.หญิงชนัญธิดา ดำงาม" },
  { key: "เอไอเอ", val: "ด.ต.หญิงบุญเลิศ โสภาพงษ์" },
  { key: "ปูนอินทรี", val: "ด.ต.หญิงสะใบทอง กะตะจิต" },
  { key: "ชูทิศวิทยา", val: "ด.ต.อมรินทร์ จารุสาร" },
  { key: "ช่างกลปทุมวัน", val: "พ.ต.ท.รำไพ งิ้วไชยราช" },
  { key: "บ้านหาดทรายเพ", val: "ด.ต.อมรินทร์ จารุสาร" },
  { key: "จินดาพา", val: "ด.ต.หญิงรุ่งทิพย์ เวลา" },
  { key: "จินดาภา", val: "ด.ต.หญิงรุ่งทิพย์ เวลา" },
  { key: "สายัณหวิกสิต", val: "ด.ต.หญิงรุ่งทิพย์ เวลา" },
  { key: "หนองดู่", val: "ด.ต.หญิงรุ่งทิพย์ เวลา" },
  { key: "บ้านนาสามัคคี", val: "ด.ต.วิบูลย์ บุญเหลื่อม" },
  { key: "คอนราดเฮงเค็ล", val: "ด.ต.วรวิทย์ เสนาศรี" },
  { key: "ค็อกนิสไทย", val: "พ.ต.ท.กำจัด ผาใต้" },
  { key: "คอกนิสไทย", val: "พ.ต.ท.กำจัด ผาใต้" },
  { key: "การท่าอากาศยาน", val: "ด.ต.ชัยสิทธิ์ โคตรโสภา" },
  { key: "บ้านนากระเสริม", val: "ด.ต.เกียรตินิยม โพธิ์พุ่ม" },
  { key: "บ้านปากห้วยม่วง", val: "ด.ต.อภิชา ศิริเนตร์" },
  { key: "ใต้ร่มพระบารมี", val: "จ.ส.ต.ศิวนัส บอนคำ" },
  { key: "เฉลิมราษฎร์บำรุง", val: "พ.ต.ท.ชินกร สมบูรณ์ทรัพย์" },
  { key: "บ้านห้วยเป้า", val: "ด.ต.หญิงประกายพร ชัยจันทร์" },
  { key: "บ้านห้วยเวียงงาม", val: "ร.ต.อ.หญิงอุไรวรรณ สมบุตร" },
  { key: "ฮิลมาร์พาเบิล", val: "พ.ต.ท.อาทิตย์ บุญเทพ" },
  { key: "ฮิลมาร์พาเบิ้ล", val: "พ.ต.ท.อาทิตย์ บุญเทพ" },
  { key: "บ้านห้วยดอกไม้", val: "จ.ส.ต.ธวัชชัย สิงห์ราชา" },
  { key: "บ้านนานกปีด", val: "ด.ต.หญิงกิตติกา ศรีโบราณ" },
  { key: "บ้านหนองแคน", val: "พ.ต.ท.ชินกร สมบูรณ์ทรัพย์" },
  { key: "บ้านเมืองทอง", val: "ด.ต.หญิงรัศมี สิทธิธรรม" },
  { key: "บ้านวังชมภู", val: "พ.ต.ท.ศักดินนท์ ศักดา" },
  { key: "บ้านหนองตะไก้", val: "ด.ต.ศักดิ์ชาย บัวถนอม" },
  { key: "บ้านนาแวง", val: "ร.ต.อ.นัฐพล องอาจ" },
  { key: "บ้านนาชมภู", val: "พ.ต.ท.สุครีพ โพธิ์ชัย" },
  { key: "บ้านนาปอ", val: "ด.ต.ชัยพิชิต จันทะคุณ" },
  { key: "บ้านเทพภูเงิน", val: "ร.ต.ต.กิตติสัณห์ เกษสีมาปภัสร์" },
  { key: "เทพภูเงิน", val: "ร.ต.ต.กิตติสัณห์ เกษสีมาปภัสร์" },
  { key: "บ้านหมันขาว", val: "ว่าที่ พ.ต.ท.นิตย์ ไชโยแสง" },
  { key: "บ้านคำชมภู", val: "กิตติสัณห์ เกษสีมาปภัสร์" },
  { key: "คำชมภู", val: "กิตติสัณห์ เกษสีมาปภัสร์" },
  { key: "บ้านไทยเสรี", val: "ร.ต.อ.ปราโมทย์ คำพุทธา" },
  { key: "ไปรษณีย์ไทย", val: "ร.ต.อ.แสนพล ศรีภูธร" },
  { key: "ห้วยหมากหล่ำ", val: "ร.ต.อ.แสนพล ศรีภูธร" }
];

export const EXACT_ADDRESS_MAP: { key: string; address: string }[] = [
  { key: "บ้านโคกแสลง", address: "หมู่ที่ 7 บ้านโคกแสลง ตำบลตาเมียง อำเภอพนมดงรัก จ.สุรินทร์ 32140" },
  { key: "บ้านซำปะโต", address: "ตำบลอาโพน อำเภอบัวเชด จ.สุรินทร์ 32230" },
  { key: "พีระยานุเคราะห์", address: "ม.6 บ้านปรือ ต.ปรือ อ.ปราสาท จ.สุรินทร์ 32140" },
  { key: "บ้านรุน", address: "ม.- บ้านรุน ต.อาโพน อ.บัวเชด จ.สุรินทร์ 32230" },
  { key: "บ้านตาตุม", address: "ม.13 บ้านตาตุม ต.ตาตุม อ.สังขะ จ.สุรินทร์ 32150" },
  { key: "บ้านตาแตรว", address: "ม.2 บ้านตาแตรว ต.เทพรักษา อ.สังขะ จ.สุรินทร์ 32150" },
  { key: "9 สมาคมจีน", address: "หมู่ที่ 6 ตำบลละหานทราย อำเภอละหานทราย จ.บุรีรัมย์ 31170" },
  { key: "9สมาคมจีน", address: "หมู่ที่ 6 ตำบลละหานทราย อำเภอละหานทราย จ.บุรีรัมย์ 31170" },
  { key: "ท่านผู้หญิงสุประภาดา", address: "114 ตำบลตะเคียน อำเภอกาบเชิง จ.สุรินทร์ 32210" },
  { key: "ทรัพย์ทรายทอง", address: "ม.11 บ้านทรัพย์ทรายทอง ต.โคกมะม่วง อ.ปะคำ จ.บุรีรัมย์" },
  { key: "บรรจบพันบ้านปากลา", address: "ตำบลนาโพธิ์กลาง อำเภอโขงเจียม จ.อุบลราชธานี 34220" },
  { key: "บ้านตาเอ็ม", address: "ม.7 บ้านตาเอ็ม ต.ตาเกา อ.น้ำขุ่น จ.อุบลราชธานี 34260" },
  { key: "บ้านคำสะอาด", address: "ม.4 บ้านคำสะอาด ต.ยาง อ.น้ำยืน จ.อุบลราชธานี 34260" },
  { key: "บ้านท่าแสนคูณ", address: "ม.13 บ้านท่าแสนคูณ ต.โดมประดิษฐ์ อ.น้ำยืน จ.อุบลราชธานี 34260" },
  { key: "บ้านศรีสวัสดิ์", address: "ม.5 บ้านศรีสวัสดิ์ ต.ศรีแก้ว อ.ไทยเจริญ จ.ยโสธร 35120" },
  { key: "บ้านห้วยฆ้อง", address: "ม.5 บ้านห้วยฆ้อง ต.ป่าก่อ อ.ชานุมาน จ.อำนาจเจริญ 37210" },
  { key: "บ้านแก่งศรีโคตร", address: "ม.3 บ้านแก่งศรีโคตร ต.โนนก่อ อ.สิรินธร จ.อุบลราชธานี 34350" },
  { key: "เนวิน", address: "บ้านป่าไม้ ต.คอแลน อ.บุณฑริก จ.อุบลราชธานี 34230" },
  { key: "บ้านหนองใหญ่", address: "ม.11 บ้านหนองใหญ่ ต.รุง อ.กันทรลักษ์ จ.ศรีสะเกษ 33110" },
  { key: "ป่าหญ้าคา", address: "ม.9 บ้านป่าหญ้าคา ต.โนนก่อ อ.สิรินธร จ.อุบลราชธานี 34350" },
  { key: "บ้านหนองบัวพัฒนา", address: "ม.14 บ้านหนองบัว ต.โดมประดิษฐ์ อ.น้ำยืน จ.อุบลราชธานี 34280" },
  { key: "บ้านภูดานกอย", address: "ม.6 บ้านภูดานกอย ต.คำบง อ.ปทุมราชวงศา จ.อำนาจเจริญ 37110" },
  { key: "พิทักษ์ปัญญา", address: "หมู่ที่ 13 บ้านดงตาหวาน ตำบลแก่งเค็ง อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270" },
  { key: "เอไอเอ", address: "ม.8 บ้านบ๋าฮี ต.หนองผือ อ.เขมราฐ จ.อุบลราชธานี 34170" },
  { key: "ปูนอินทรี 50 ปี", address: "ม.7 บ้านห้วยกระแสน ต.ป่าก่อ อ.ชานุมาน จ.อำนาจเจริญ 37210" },
  { key: "ชูทิศวิทยา", address: "ต.หนองเทา อ.ท่าอุเทน จ.นครพนม" },
  { key: "ช่างกลปทุมวัน", address: "หมู่ที่ 6 ต.ดอนเตย อ.นาทม จ.นครพนม 48140" },
  { key: "บ้านหาดทรายเพ", address: "ม.5 บ้านหาดทรายเพ ต.หนองเทา อ.ท่าอุเทน จ.นครพนม 48120" },
  { key: "จินดาพา", address: "ม.2 บ้านยอดชาด ต.หนองเทา อ.ท่าอุเทน จ.นครพนม 48190" },
  { key: "จินดาภา", address: "ม.2 บ้านยอดชาด ต.หนองเทา อ.ท่าอุเทน จ.นครพนม 48190" },
  { key: "สายัณหวิกสิต", address: "ม.2 บ้านยอดชาด ต.หนองเทา อ.ท่าอุเทน จ.นครพนม 48190" },
  { key: "หนองดู่", address: "ม.2 บ้านยอดชาด ต.หนองเทา อ.ท่าอุเทน จ.นครพนม 48190" },
  { key: "บ้านนาสามัคคี", address: "ม.6 บ้านนาสามัคคี ต.นาทม อ.นาทม จ.นครพนม 48140" },
  { key: "คอนราดเฮงเค็ล", address: "ม.6 บ้านท่าสะอาด ต.นาใน อ.โพนสวรรค์ จ.นครพนม 48190" },
  { key: "ค็อกนิสไทย", address: "ต.แมดนาท่ม อ.โคกศรีสุพรรณ จ.สกลนคร 47280" },
  { key: "การท่าอากาศยาน", address: "ม.7 บ้านคิ้ว ต.กกตูม อ.ดงหลวง จ.มุกดาหาร 49140" },
  { key: "บ้านนากระเสริม", address: "ม.10 บ้านนากระเสริม ต.พนอม อ.ท่าอุเทน จ.นครพนม 48120" },
  { key: "บ้านปากห้วยม่วง", address: "ม.4 บ้านปากห้วยม่วง ต.นาเข อ.บ้านแพง จ.นครพนม 48140" },
  { key: "ใต้ร่มพระบารมี", address: "ตำบลบ้านเหล่า อำเภอคำชะอี จ.มุกดาหาร 49110" },
  { key: "เฉลิมราษฎร์บำรุง", address: "ม.8 บ้านน้ำเย็น ต.ด่านซ้าย อ.ด่านซ้าย จ.เลย 42120" },
  { key: "บ้านห้วยเป้า", address: "ม.5 บ้านห้วยเป้า ต.ปากชม อ.ปากชม จ.เลย 42150" },
  { key: "บ้านห้วยเวียงงาม", address: "ม.5 บ้านห้วยเวียงงาม ต.เขาหลวง อ.วังสะพุง จ.เลย 41380" },
  { key: "ฮิลมาร์พาเบิล", address: "หมู่9 บ้านเหมืองทอง ต.เชียงกลม อ.ปากชม จ.เลย 42150" },
  { key: "ฮิลมาร์พาเบิ้ล", address: "หมู่9 บ้านเหมืองทอง ต.เชียงกลม อ.ปากชม จ.เลย 42150" },
  { key: "บ้านห้วยดอกไม้", address: "ม.4 ตำบลวิศิษฐ์ อำเภอเมืองบึงกาฬ จ.บึงกาฬ 38000" },
  { key: "บ้านนานกปีด", address: "ม.5 บ้านนานกปีด ต.ปากชม อ.ปากชม จ.เลย 42150" },
  { key: "บ้านหนองแคน", address: "ม.- บ้านหนองแคน ต.นาด้วง อ.นาด้วง จ.เลย 42210" },
  { key: "บ้านเมืองทอง", address: "ม.11 บ้านเมืองทอง ต.โนนทอง อ.นายูง จ.อุดรธานี 41380" },
  { key: "บ้านวังชมภู", address: "ม.- ตำบลทรัพย์ไพวัลย์ อำเภอเอราวัณ จ.เลย 42220" },
  { key: "บ้านหนองตะไก้", address: "ตำบลโป่งเปื่อย อำเภอเมืองบึงกาฬ จ.บึงกาฬ 38000" },
  { key: "บ้านนาแวง", address: "ม.- ตำบลนาสวรรค์ อำเภอเมืองบึงกาฬ จ.บึงกาฬ 38000" },
  { key: "บ้านนาชมภู", address: "ต.บ้านก้อง อ.นายูง จ.อุดรธานี 41380" },
  { key: "บ้านนาปอ", address: "ม.- บ้านนาปอ ต.แสงภา อ.นาแห้ว จ.เลย 42170" },
  { key: "บ้านเทพภูเงิน", address: "ม.- บ้านเทพภูเงิน ต.น้ำโสม อ.น้ำโสม จ.อุดรธานี" },
  { key: "บ้านหมันขาว", address: "ม.- บ้านหมันขาว ต.กกสะทอน อ.ด่านซ้าย จ.เลย 42120" },
  { key: "บ้านคำชมภู", address: "ม.- บ้านคำชมภู ตำบลบ้านต้อง อำเภอเซกา จ.บึงกาฬ 38220" },
  { key: "บ้านไทยเสรี", address: "ม.- บ้านไทยเสรี ต.เซกา อ.เซกา จ.บึงกาฬ 38150" },
  { key: "ไปรษณีย์ไทย", address: "ม.- บ้านห้วยหมากหล่ำ ต.ทมนางาม อ.โนนสะอาด จ.อุดรธานี 41240" },
  { key: "ห้วยหมากหล่ำ", address: "ม.- บ้านห้วยหมากหล่ำ ต.ทมนางาม อ.โนนสะอาด จ.อุดรธานี 41240" }
];

export const getPrincipalBySchoolName = (schoolName: string): string => {
  if (!schoolName) return "ไม่ระบุชื่อครูใหญ่";
  const cleanSName = schoolName
    .replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\.|รร\.ตขด\./g, "")
    .replace(/ /g, "")
    .trim();
  
  for (const entry of PRINCIPAL_MAP) {
    const cleanKey = entry.key.replace(/ /g, "");
    if (cleanSName.includes(cleanKey) || cleanKey.includes(cleanSName)) {
      return entry.val;
    }
  }
  return "ไม่ระบุชื่อครูใหญ่";
};

export const getSchoolAddressBySchoolName = (schoolName: string): string => {
  if (!schoolName) return "ไม่ระบุที่อยู่";
  const cleanSName = schoolName
    .replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\.|รร\.ตขด\./g, "")
    .replace(/ /g, "")
    .trim();

  // Try custom exact address first
  if (typeof window !== "undefined") {
    try {
      const customExactSaved = window.localStorage.getItem("custom_exact_addresses");
      if (customExactSaved) {
        const exactMap = JSON.parse(customExactSaved);
        for (const [key, value] of Object.entries(exactMap)) {
          const cleanKey = key.replace(/ /g, "");
          if (cleanSName.includes(cleanKey) || cleanKey.includes(cleanSName)) {
            return value as string;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Try exact address map first
  for (const entry of EXACT_ADDRESS_MAP) {
    const cleanKey = entry.key.replace(/ /g, "");
    if (cleanSName.includes(cleanKey) || cleanKey.includes(cleanSName)) {
      return entry.address;
    }
  }

  // Fallback to structured calculation
  const sch = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (sch) {
    const vNo = sch.villageNo && sch.villageNo !== "-" ? `หมู่ ${sch.villageNo} ` : "";
    return `${vNo}บ้าน${sch.village || sch.name.replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\./g, '')} ต.${sch.subdistrict} อ.${sch.district} จ.${sch.province}`;
  }
  return "สังกัดกองบังคับการตำรวจตระเวนชายแดนภาค 2";
};

export const SCHOOL_COORDINATES_MAP: Record<string, [number, number]> = {
  "SCH-001": [14.395806, 103.285204], // รร.ตชด.บ้านโคกแสลง (สุรินทร์)
  "SCH-002": [14.472153, 103.922253], // รร.ตชด.บ้านซำปะโต (สุรินทร์)
  "SCH-003": [14.574816, 103.321355], // รร.ตชด.พีระยานุเคราะห์ฯ 2 (สุรินทร์)
  "SCH-004": [14.471855, 103.987321], // รร.ตชด.บ้านรุน (สุรินทร์)
  "SCH-005": [14.522141, 103.754511], // รร.ตชด.บ้านตาตุม (สุรินทร์)
  "SCH-006": [14.534158, 103.833980], // รร.ตชด.บ้านตาแตรว (สุรินทร์)
  "SCH-007": [14.401697, 102.841989], // รร.ตชด.ชมรม 9 สมาคมจีนแห่งประเทศไทยอุปถัมภ์ (บุรีรัมย์)
  "SCH-008": [14.477319, 103.659232], // รร.ตชด.ท่านผู้หญิงสุประภาดา เกษมสันต์ (สุรินทร์)
  "SCH-009": [14.394115, 102.614888], // ศกร.ตชด.ทรัพย์ทรายทอง (บุรีรัมย์)
  "SCH-010": [15.643794, 105.633969], // รร.ตชด.บรรจบพันบ้านปากลา (อุบลราชธานี)
  "SCH-011": [14.541603, 104.869675], // รร.ตชด.บ้านตาเอ็ม (อุบลราชธานี)
  "SCH-012": [14.592676, 105.145676], // รร.ตชด.บ้านคำสะอาด (อุบลราชธานี)
  "SCH-013": [14.495337, 105.137616], // รร.ตชด.บ้านท่าแสนคูณ (อุบลราชธานี)
  "SCH-014": [16.137511, 104.357834], // รร.ตชด.บ้านศรีสวัสดิ์ (ยโสธร)
  "SCH-015": [16.010262, 104.899236], // รร.ตชด.บ้านห้วยฆ้อง (อำนาจเจริญ)
  "SCH-016": [15.008085, 105.459357], // รร.ตชด.บ้านแก่งศรีโคตร (อุบลราชธานี)
  "SCH-017": [14.901727, 105.466846], // รร.ตชด.ศาสตราจารย์ ดอกเตอร์เนวิน สคริมชอว์ (อุบลราชธานี)
  "SCH-018": [14.500336, 104.660768], // รร.ตชด.บ้านหนองใหญ่ (ศรีสะเกษ)
  "SCH-019": [14.984865, 105.513278], // ศกร.ตชด.ชุมชนป่าหญ้าคา (อุบลราชธานี)
  "SCH-020": [14.442968, 105.170177], // รร.ตชด.บ้านหนองบัวพัฒนา (อุบลราชธานี)
  "SCH-021": [15.997350, 104.973709], // รร.ตชด.บ้านภูดานกอย (อำนาจเจริญ)
  "SCH-022": [15.775534, 105.114298], // รร.ตชด.พิทักษ์ปัญญา (อุบลราชธานี)
  "SCH-023": [15.925391, 105.046394], // รร.ตชด.เอไอเอ ประเทศไทย (บ้านบ๋าฮี) (อุบลราชธานี)
  "SCH-024": [16.041465, 104.880387], // รร.ตชด.ปูนอินทรี 50 ปี (บ้านห้วยกระแสน) (อำนาจเจริญ)
  "SCH-025": [17.831703, 104.329667], // รร.ตชด.ชูทิศวิทยา (นครพนม)
  "SCH-026": [17.846750, 104.100851], // รร.ตชด.ช่างกลปทุมวันอนุสรณ์ 8 (นครพนม)
  "SCH-027": [17.784361, 104.367322], // รร.ตชด.บ้านหาดทรายเพ (นครพนม)
  "SCH-028": [17.447981, 104.568360], // รร.ตชด.ศ.ดร.พญ.จินดาพาฯ (นครพนม)
  "SCH-029": [17.897825, 104.029006], // รร.ตชด.บ้านนาสามัคคี (นครพนม)
  "SCH-030": [17.462003, 104.536194], // รร.ตชด.คอนราดเฮงเค็ล (นครพนม)
  "SCH-031": [17.058545, 104.349774], // รร.ตชด.ค็อกนิสไทยฯ (สกลนคร)
  "SCH-032": [16.678873, 104.207942], // รร.ตชด.การท่าอากาศยานฯ (มุกดาหาร)
  "SCH-033": [17.734786, 104.396816], // รร.ตชด.บ้านนากระเสริม (นครพนม)
  "SCH-034": [17.844258, 104.285178], // รร.ตชด.บ้านปากห้วยม่วง (นครพนม)
  "SCH-035": [16.700864, 104.271503], // ศกร.ตชด.ใต้ร่มพระบารมี (มุกดาหาร)
  "SCH-036": [17.468442, 101.134628], // รร.ตชด.เฉลิมราษฎร์บำรุง (เลย)
  "SCH-037": [17.911761, 101.906009], // รร.ตชด.บ้านห้วยเป้า (เลย)
  "SCH-038": [17.896546, 102.186306], // รร.ตชด.บ้านห้วยเวียงงาม (เลย)
  "SCH-039": [17.906801, 101.945492], // รร.ตชด.ฮิลมาร์พาเบิล (เลย)
  "SCH-040": [18.356168, 103.582709], // รร.ตชด.บ้านห้วยดอกไม้ (บึงกาฬ)
  "SCH-041": [17.689096, 101.977199], // รร.ตชด.บ้านนานกปีด (เลย)
  "SCH-042": [17.491154, 102.074931], // รร.ตชด.บ้านหนองแคน (เลย)
  "SCH-043": [17.970655, 102.127729], // รร.ตชด.บ้านเมืองทอง (อุดรธานี)
  "SCH-044": [17.211830, 101.985032], // รร.ตชด.บ้านวังชมภู (เลย)
  "SCH-045": [18.351385, 103.510522], // รร.ตชด.บ้านหนองตะไก้ (บึงกาฬ)
  "SCH-046": [18.261283, 103.550924], // รร.ตชด.บ้านนาแวง (บึงกาฬ)
  "SCH-047": [17.817371, 102.129504], // รร.ตชด.บ้านนาชมภู (อุดรธานี)
  "SCH-048": [17.466138, 100.917469], // รร.ตชด.บ้านนาปอ (เลย)
  "SCH-049": [17.690859, 102.042612], // รร.ตชด.บ้านเทพภูเงิน (อุดรธานี)
  "SCH-050": [16.960930, 101.076003], // รร.ตชด.บ้านหมันขาว (เลย)
  "SCH-051": [18.071464, 103.978040], // รร.ตชด.บ้านคำชมภู (บึงกาฬ)
  "SCH-052": [18.015038, 103.963934], // รร.ตชด.บ้านไทยเสรี (บึงกาฬ)
  "SCH-053": [16.875107, 102.983664]  // รร.ตชด.ไปรษณีย์ไทย (บ้านห้วยหมากหล่ำ) (อุดรธานี)
};

export const getSchoolList = (): TargetSchool[] => {
  if (typeof window === "undefined") return BASE_OFFICIAL_TARGET_SCHOOLS;
  try {
    const saved = window.localStorage.getItem("custom_school_addresses");
    if (saved) {
      const customMap = JSON.parse(saved);
      return BASE_OFFICIAL_TARGET_SCHOOLS.map(s => {
        if (customMap[s.id]) {
          return { ...s, ...customMap[s.id] };
        }
        return s;
      });
    }
  } catch (e) {
    // ignore
  }
  return BASE_OFFICIAL_TARGET_SCHOOLS;
};

export const OFFICIAL_TARGET_SCHOOLS = new Proxy(BASE_OFFICIAL_TARGET_SCHOOLS, {
  get(target, prop) {
    const currentList = getSchoolList();
    const value = (currentList as any)[prop];
    if (typeof value === 'function') {
      return value.bind(currentList);
    }
    return value;
  },
  getOwnPropertyDescriptor(target, prop) {
    const currentList = getSchoolList();
    return Reflect.getOwnPropertyDescriptor(currentList, prop);
  },
  ownKeys(target) {
    const currentList = getSchoolList();
    return Reflect.ownKeys(currentList);
  }
});

export const updateCustomSchoolAddress = (schoolId: string, updatedFields: Partial<TargetSchool>) => {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem("custom_school_addresses");
    const customMap = saved ? JSON.parse(saved) : {};
    customMap[schoolId] = {
      ...(customMap[schoolId] || {}),
      ...updatedFields
    };
    window.localStorage.setItem("custom_school_addresses", JSON.stringify(customMap));
    
    // Also update EXACT_ADDRESS_MAP dynamic override!
    const targetSchool = BASE_OFFICIAL_TARGET_SCHOOLS.find(s => s.id === schoolId);
    if (targetSchool) {
      const merged = { ...targetSchool, ...updatedFields };
      const newAddress = `หมู่ที่ ${merged.villageNo || "-"} บ้าน${merged.village || "-"} ตำบล${merged.subdistrict} อำเภอ${merged.district} จ.${merged.province}`;
      
      const exactSaved = window.localStorage.getItem("custom_exact_addresses");
      const exactMap = exactSaved ? JSON.parse(exactSaved) : {};
      
      const key = merged.name.replace(/รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\./g, "").trim();
      exactMap[key] = newAddress;
      window.localStorage.setItem("custom_exact_addresses", JSON.stringify(exactMap));
    }
    
    // Dispatch window event for live React update
    window.dispatchEvent(new Event("schoolAddressesUpdated"));
  } catch (e) {
    console.error("Error updating custom school address", e);
  }
};

export const getSchoolGpsBySchoolName = (schoolName: string): [number, number] | null => {
  if (!schoolName) return null;
  const sch = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (sch) {
    if (sch.latitude && sch.longitude) {
      const lat = parseFloat(sch.latitude);
      const lng = parseFloat(sch.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    const coords = SCHOOL_COORDINATES_MAP[sch.id];
    if (coords) return coords;
  }
  return [15.23, 104.85];
};
