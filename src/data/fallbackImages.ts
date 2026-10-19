// High quality category fallback images for BPP School Development Plan (กพด. ฉบับที่ 5)
export const GOAL_FALLBACK_IMAGES: Record<number, string[]> = {
  1: [ // ด้านที่ 1: สุขภาพ/โภชนาการ/อนามัย
    "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1595838788390-3304192b67f1?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80"
  ],
  2: [ // ด้านที่ 2: โอกาสทางการศึกษา
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"
  ],
  3: [ // ด้านที่ 3: วิชาการและจริยธรรม
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
  ],
  4: [ // ด้านที่ 4: งานอาชีพและสหกรณ์
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1592417817098-8f3d6eb12765?auto=format&fit=crop&w=800&q=80"
  ],
  5: [ // ด้านที่ 5: ทรัพยากรธรรมชาติและสิ่งแวดล้อม
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=800&q=80"
  ],
  6: [ // ด้านที่ 6: วัฒนธรรมและภูมิปัญญา
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80"
  ],
  7: [ // ด้านที่ 7: ขยายจากโรงเรียนสู่ชุมชน/จิตอาสา
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80"
  ],
  8: [ // ด้านที่ 8: ศูนย์บริการความรู้/อาคารสถานที่
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
  ]
};

export function getGoalFallbackImage(goalId: number, index: number = 0): string {
  const list = GOAL_FALLBACK_IMAGES[goalId] || GOAL_FALLBACK_IMAGES[1];
  const safeIdx = Math.abs(index) % list.length;
  return list[safeIdx];
}
