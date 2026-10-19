import fs from 'fs';
import path from 'path';

// Parse KML text
const kmlText = fs.readFileSync('src/data/raw_schools_53.kml', 'utf8');

function parseKML(kml) {
  const folderRegex = /<Folder\s+id="[^"]*">([\s\S]*?)<\/Folder>/g;
  const placemarkRegex = /<Placemark\s+id="[^"]*">([\s\S]*?)<\/Placemark>/g;
  
  const schools = [];
  let folderMatch;
  let schoolIndex = 1;
  
  while ((folderMatch = folderRegex.exec(kml)) !== null) {
    const folderContent = folderMatch[1];
    const folderNameMatch = folderContent.match(/<name>(.*?)<\/name>/);
    const folderName = folderNameMatch ? folderNameMatch[1].trim() : "";
    
    let placemarkMatch;
    while ((placemarkMatch = placemarkRegex.exec(folderContent)) !== null) {
      const pmContent = placemarkMatch[1];
      const nameMatch = pmContent.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].trim() : "";
      
      const descMatch = pmContent.match(/<description>([\s\S]*?)<\/description>/);
      const desc = descMatch ? descMatch[1] : "";
      
      const coordMatch = pmContent.match(/<coordinates>\s*([0-9.]+)\s*,\s*([0-9.]+)/);
      const coordLng = coordMatch ? parseFloat(coordMatch[1]) : 0;
      const coordLat = coordMatch ? parseFloat(coordMatch[2]) : 0;
      
      // Parse description lines
      const parseDescField = (fieldName) => {
        const regex = new RegExp(fieldName + "\\s*:\\s*(.*)", "i");
        const m = desc.match(regex);
        return m ? m[1].trim() : "";
      };
      
      const schoolCode = parseDescField("รหัสโรงเรียน");
      const schoolType = parseDescField("ประเภทโรงเรียน");
      const officialSchoolName = parseDescField("ชื่อโรงเรียน") || name;
      const schoolSize = parseDescField("รร.ขนาด");
      const educationLevels = parseDescField("เปิดสอนระดับ");
      
      const villageNo = parseDescField("หมู่ที่");
      const village = parseDescField("บ้าน");
      const subdistrict = parseDescField("ตำบล");
      const district = parseDescField("อำเภอ");
      const province = parseDescField("จังหวัด");
      const zipCode = parseDescField("รหัสไปรษณีย์");
      const militaryGrid = parseDescField("พิกัดทางทหาร");
      const latitude = parseDescField("LATITUDE");
      const longitude = parseDescField("LONGITUDE");
      
      const principalName = parseDescField("ชื่อครูใหญ่");
      const phone = parseDescField("โทรศัพท์");
      const email = parseDescField("E-mail");
      
      const estDay = parseDescField("วัน");
      const estMonth = parseDescField("เดือน");
      const estYear = parseDescField("ปี");
      const estDate = `${estDay} ${estMonth} ${estYear}`.trim();
      
      const bppDivision = parseDescField("กก.ตชด.");
      const bppCompany = parseDescField("กองร้อย ตชด.");
      const eduServiceArea = parseDescField("เขตพื้นที่การศึกษา");
      
      const studentsMale = parseInt(parseDescField("นักเรียน \\(ชาย\\)")) || 0;
      const studentsFemale = parseInt(parseDescField("นักเรียน \\(หญิง\\)")) || 0;
      const studentsTotal = parseInt(parseDescField("นักเรียน \\(รวม\\)")) || (studentsMale + studentsFemale);
      const studentEthnicity = parseDescField("เชื้อชาติ\\(นักเรียน\\)");
      const studentReligion = parseDescField("ศาสนา\\(นักเรียน\\)");
      
      const teacherBPP = parseInt(parseDescField("ครู \\(ตชด.\\)")) || 0;
      const teacherChildCare = parseInt(parseDescField("ครู \\(ผดด.\\)")) || 0;
      const teacherOBEC = parseInt(parseDescField("ครู \\(สพฐ.\\)")) || 0;
      const teacherSST = parseInt(parseDescField("ครู \\(สสท.\\)")) || 0;
      const teacherPAO = parseInt(parseDescField("ครู \\(อบจ.\\)")) || 0;
      const teacherSAO = parseInt(parseDescField("ครู \\(อบต.\\)")) || 0;
      const teacherOther = parseInt(parseDescField("ครู/บุคลากร \\(อื่นๆ\\)")) || 0;
      const teacherTotal = parseInt(parseDescField("ครู \\(รวม\\)")) || (teacherBPP + teacherChildCare + teacherOBEC + teacherSST + teacherPAO + teacherSAO + teacherOther);
      
      const landType = parseDescField("ประเภทที่ดิน");
      const landPermission = parseDescField("การอนุญาต");
      const landRai = parseDescField("ไร");
      const landNgan = parseDescField("งาน");
      const landSqWa = parseDescField("ตารางวา");
      
      const internetSignal = parseDescField("ประเภทสัญญาณอินเทอร์เน็ต");
      const internetType = parseDescField("ประเภทอินเทอร์เน็ต");
      const internetStatus = parseDescField("การใช้งานอินเทอร์เน็ต");
      const internetIssues = parseDescField("ปัญหาการใช้อินเทอร์เน็ตที่พบ");
      
      const electricityPEA = parseDescField("การใช้ไฟฟ้า \\(กฟภ.\\)");
      const electricityPEAKw = parseDescField("ขนาด \\(KW\\)");
      const electricityPEAStatus = parseDescField("สถานะการใช้งาน \\(กฟภ.\\)");
      const solarCell = parseDescField("พลังงานแสงอาทิตย์ \\(solar cell\\)");
      const solarBatteryKw = parseDescField("ขนาดแบต \\(kW\\)");
      const solarStatus = parseDescField("การใช้งาน \\(โซล่าเซลล์\\)");
      const solarSponsor = parseDescField("หน่วยงานสนับสนุนไฟฟ้าพลังงานแสงอาทิตย์");
      const hydroPower = parseDescField("ไฟฟ้าพลังงานน้ำ");
      
      const travelHelicopter = parseDescField("เฮลิคอปเตอร์ \\(กก.ตชด. - รร.ตชด.\\)");
      const travelDistanceTime = parseDescField("ระยะทาง/เวลา \\(กก.ตชด. - รร.ตชด.\\)");
      const travelRoadCondition = parseDescField("ลักษณะเส้นทาง/การเดินทางสะดวก/ลำบาก");
      
      const schoolId = `SCH-${String(schoolIndex).padStart(3, '0')}`;
      schoolIndex++;
      
      schools.push({
        id: schoolId,
        kmlName: name,
        schoolCode,
        schoolType: schoolType || "รร.ตชด.",
        name: officialSchoolName.startsWith("รร.") || officialSchoolName.startsWith("ศกร.") ? officialSchoolName : `รร.ตชด.${officialSchoolName}`,
        shortName: name,
        schoolSize,
        educationLevels,
        bppGroup: folderName || `กก.ตชด.${bppDivision}`,
        bppDivision,
        bppCompany,
        eduServiceArea,
        villageNo,
        village,
        subdistrict,
        district,
        province,
        zipCode,
        fullAddress: `หมู่ที่ ${villageNo || "-"} บ้าน${village} ต.${subdistrict} อ.${district} จ.${province} ${zipCode || ""}`.trim(),
        militaryGrid,
        latitude: latitude ? parseFloat(latitude) : coordLat,
        longitude: longitude ? parseFloat(longitude) : coordLng,
        coordinates: [coordLat || (latitude ? parseFloat(latitude) : 0), coordLng || (longitude ? parseFloat(longitude) : 0)],
        principal: {
          name: principalName,
          phone,
          email
        },
        establishedDate: estDate,
        students: {
          male: studentsMale,
          female: studentsFemale,
          total: studentsTotal,
          ethnicity: studentEthnicity,
          religion: studentReligion
        },
        teachers: {
          bpp: teacherBPP,
          childCare: teacherChildCare,
          obec: teacherOBEC,
          sst: teacherSST,
          pao: teacherPAO,
          sao: teacherSAO,
          other: teacherOther,
          total: teacherTotal
        },
        land: {
          type: landType,
          permissionStatus: landPermission,
          rai: landRai,
          ngan: landNgan,
          sqWa: landSqWa
        },
        internet: {
          signalType: internetSignal,
          providerType: internetType,
          status: internetStatus,
          issues: internetIssues
        },
        electricity: {
          pea: electricityPEA,
          peaKw: electricityPEAKw,
          peaStatus: electricityPEAStatus,
          solar: solarCell,
          solarKw: solarBatteryKw,
          solarStatus: solarStatus,
          solarSponsor: solarSponsor,
          hydro: hydroPower
        },
        travel: {
          helicopter: travelHelicopter,
          distanceTime: travelDistanceTime,
          roadCondition: travelRoadCondition
        }
      });
    }
  }
  
  return schools;
}
