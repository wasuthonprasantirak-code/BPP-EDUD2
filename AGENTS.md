# ระบบมาตรฐานการออกแบบและดีไซน์ (Design System & Typography Standards)

เพื่อความเป็นระเบียบเรียบร้อยและความสวยงามระดับเวิลด์คลาสที่สอดคล้องกันทั่วทั้งระบบ (ยกเว้นหน้ากระดาษรายงานแบบกระดาษ A4) เราใช้มาตรฐานขนาดตัวอักษรและโครงสร้างความสูง (Line Height) ต่อไปนี้ร่วมกัน:

## 1. คลาสสไตล์ตัวอักษรมาตรฐาน (Typography Standards)

*   **มาตรฐานหัวข้อหลัก (Main Title - H1)**
    *   **CSS Class:** `.typo-app-h1` (หรือ Tailwind: `text-2xl sm:text-3xl font-black text-slate-900 tracking-tight`)
    *   **การใช้งาน:** ชื่อหลักประจำหน้า หรือหัวข้อใหญ่สุดด้านบนสุดของแต่ละหน้าจอ
*   **มาตรฐานหัวข้อย่อย (Section Title - H2)**
    *   **CSS Class:** `.typo-app-h2` (หรือ Tailwind: `text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight`)
    *   **การใช้งาน:** หัวข้อกลุ่มข้อมูลหลัก หรือหัวข้อกล่อง Widget ขนาดใหญ่
*   **มาตรฐานหัวข้อย่อยระดับการ์ด (Card Header - H3)**
    *   **CSS Class:** `.typo-app-h3` (หรือ Tailwind: `text-base sm:text-lg font-bold text-slate-900`)
    *   **การใช้งาน:** ชื่อหัวข้อภายในการ์ด ข้อมูลย่อย หรือหัวข้อระดับ Component
*   **มาตรฐานหัวข้อการแสดงสถิติและกราฟ (Chart Title)**
    *   **CSS Class:** `.typo-app-chart-title` (หรือ Tailwind: `text-sm sm:text-base font-black text-indigo-950 tracking-tight`)
    *   **การใช้งาน:** หัวข้อกราฟแท่ง กราฟเส้น หรือสรุปตัวเลขสถิติหลัก
*   **มาตรฐานเนื้อความปกติ (Standard Body Text)**
    *   **CSS Class:** `.typo-app-body` (หรือ Tailwind: `text-sm font-normal text-slate-700 leading-relaxed`)
    *   **การใช้งาน:** เนื้อหาโครงการ รายละเอียด คำอธิบายทั่วไปของข้อความทั้งหมดในหน้าจอ
*   **มาตรฐานเนื้อความย่อย / คำใบ้ (Subtext / Caption)**
    *   **CSS Class:** `.typo-app-subtext` (หรือ Tailwind: `text-xs font-medium text-slate-500`)
    *   **การใช้งาน:** คำอธิบายเล็กๆ คำใบ้ข้อมูล หรือตัวเลขประกอบที่ไม่เน้นสายตา
*   **มาตรฐานการ์ดและปุ่ม (Card & Button Rules)**
    *   **CSS Class การ์ดทั่วไป:** `.app-card-surface` (`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 p-5 sm:p-6`)

---

## 2. ตัวอย่างคำสั่งสั่งการเพื่อจัดระเบียบหน้าจอ (How to Prompt the AI to Apply Standards)

เมื่อท่านต้องการปรับเปลี่ยนหรือสร้างหน้าจอใหม่ ให้เป็นระเบียบเรียบร้อย สวยงาม และสอดคล้องตามมาตรฐานเดียวกัน ท่านสามารถก๊อปปี้คำสั่ง (Prompt) นี้ส่งให้ผมหรือ AI พัฒนาต่อได้ทันทีครับ:

```text
[มาตรฐานสากล] ปรับปรุงดีไซน์ หน้า [ระบุชื่อหน้า เช่น แดชบอร์ด / รายงาน / สรุปผล] ให้เป็นระเบียบเรียบร้อยระดับเวิลด์คลาส โดยใช้คลาสมาตรฐานระบบ:
1. หัวข้อหลักใช้ .typo-app-h1 (ขนาด 2xl-3xl, font-black, text-slate-900)
2. หัวข้อย่อยใช้ .typo-app-h2 (ขนาด xl-2xl, font-extrabold)
3. หัวข้อระดับการ์ดและ Widget ใช้ .typo-app-h3 (ขนาด base-lg, font-bold)
4. เนื้อความ รายละเอียดข้อมูล และข้อความทั้งหมด ให้ใช้ .typo-app-body (ขนาด sm, font-normal, text-slate-700)
5. คำอธิบายเพิ่มเติมขนาดเล็กใช้ .typo-app-subtext (ขนาด xs, text-slate-500)
6. การ์ดบรรจุข้อมูลต้องมีความหนาขอบและความโค้งมนที่สมดุลร่วมกันโดยใช้คลาส .app-card-surface (ขอบมน rounded-2xl, เส้นขอบ border-slate-200/90)
*หมายเหตุ: ยกเว้นส่วนแสดงผลของหน้ากระดาษรายงานแบบ A4 (A4Document) ที่ใช้สำหรับการพิมพ์และจัดส่งไว้ตามสไตล์เดิม*
```
