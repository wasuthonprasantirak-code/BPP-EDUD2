// Generate schools profile data
import fs from 'fs';

export interface SchoolProfile {
  id: string;
  code: string;
  type: string;
  name: string;
  shortName: string;
  size: string;
  levels: string;
  division: string; // กก.ตชด. 21, 22, 23, 24
  company: string; // ร้อย ตชด.
  eduArea: string; // เขตพื้นที่การศึกษา
  villageNo: string;
  village: string;
  subdistrict: string;
  district: string;
  province: string;
  zipCode: string;
  militaryGrid: string;
  lat: number;
  lng: number;
  principal: {
    name: string;
    phone: string;
    email: string;
  };
  estDate: string;
  students: {
    male: number;
    female: number;
    total: number;
    ethnicity: string;
    religion: string;
  };
  teachers: {
    bpp: number;
    childCare: number;
    obec: number;
    sst: number;
    pao: number;
    sao: number;
    other: number;
    total: number;
  };
  land: {
    type: string;
    permission: string;
    rai: string;
    ngan: string;
    sqWa: string;
  };
  internet: {
    signal: string;
    type: string;
    status: string;
    issues: string;
  };
  electricity: {
    pea: string;
    kw: string;
    status: string;
    solar: string;
    batteryKw: string;
    solarStatus: string;
    sponsor: string;
    hydro: string;
  };
  travel: {
    heli: string;
    distanceTime: string;
    roadCondition: string;
  };
}
