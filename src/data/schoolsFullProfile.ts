import type { SchoolProfile } from "../types/schoolProfile";
import { SCHOOLS_DIV_21 } from "./schoolsDivision21";
import { SCHOOLS_DIV_22 } from "./schoolsDivision22";
import { SCHOOLS_DIV_23 } from "./schoolsDivision23";
import { SCHOOLS_DIV_24 } from "./schoolsDivision24";

export type { SchoolProfile };

export const ALL_53_SCHOOLS_PROFILE: SchoolProfile[] = [
  ...SCHOOLS_DIV_21,
  ...SCHOOLS_DIV_22,
  ...SCHOOLS_DIV_23,
  ...SCHOOLS_DIV_24
];

export const SCHOOLS_BY_DIVISION = {
  "กก.ตชด.21": SCHOOLS_DIV_21,
  "กก.ตชด.22": SCHOOLS_DIV_22,
  "กก.ตชด.23": SCHOOLS_DIV_23,
  "กก.ตชด.24": SCHOOLS_DIV_24
};

// Summary Statistics for the 53 schools
export function getSchoolsDatabaseStats() {
  const totalSchools = ALL_53_SCHOOLS_PROFILE.length;
  let totalStudents = 0;
  let totalMaleStudents = 0;
  let totalFemaleStudents = 0;
  let totalTeachers = 0;
  let totalBppTeachers = 0;
  let totalChildCareTeachers = 0;
  let totalObecTeachers = 0;
  let totalOtherTeachers = 0;
  let withSolarCount = 0;
  let electricityNormalCount = 0;

  for (const s of ALL_53_SCHOOLS_PROFILE) {
    totalStudents += s.students.total;
    totalMaleStudents += s.students.male;
    totalFemaleStudents += s.students.female;
    totalTeachers += s.teachers.total;
    totalBppTeachers += s.teachers.bpp;
    totalChildCareTeachers += s.teachers.childCare;
    totalObecTeachers += s.teachers.obec;
    totalOtherTeachers += (s.teachers.sst + s.teachers.pao + s.teachers.sao + s.teachers.other);
    
    if (s.electricity.solar === "มี") withSolarCount++;
    if (s.electricity.status.includes("ปกติ")) electricityNormalCount++;
  }

  return {
    totalSchools,
    totalStudents,
    totalMaleStudents,
    totalFemaleStudents,
    totalTeachers,
    totalBppTeachers,
    totalChildCareTeachers,
    totalObecTeachers,
    totalOtherTeachers,
    withSolarCount,
    electricityNormalCount,
    div21Count: SCHOOLS_DIV_21.length,
    div22Count: SCHOOLS_DIV_22.length,
    div23Count: SCHOOLS_DIV_23.length,
    div24Count: SCHOOLS_DIV_24.length
  };
}

export function findSchoolProfile(query: string): SchoolProfile | undefined {
  if (!query) return undefined;
  const cleanQ = query.trim().toLowerCase().replace(/รร\.ตชด\.|รร\.|ศกร\.ตชด\.|ศกร\./g, "");
  return ALL_53_SCHOOLS_PROFILE.find(s => {
    const cleanName = s.name.toLowerCase().replace(/รร\.ตชด\.|รร\.|ศกร\.ตชด\.|ศกร\./g, "");
    return cleanName.includes(cleanQ) || 
           s.shortName.toLowerCase().includes(cleanQ) ||
           s.code.includes(cleanQ) ||
           s.id.toLowerCase() === cleanQ.toLowerCase() ||
           s.principal.name.toLowerCase().includes(cleanQ);
  });
}
