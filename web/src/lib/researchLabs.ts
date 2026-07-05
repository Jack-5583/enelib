export interface ResearchLab {
  id: string;
  name: string;
  clubid: string;
  menuid: string;
}

export const RESEARCH_LABS: ResearchLab[] = [
  {
    id: "singugeo",
    name: "신국어연구소",
    clubid: process.env.NAVER_CAFE_SINGUGEO_CLUBID || "",
    menuid: process.env.NAVER_CAFE_SINGUGEO_MENUID || "",
  },
  {
    id: "jeongseokjun",
    name: "정석준연구소",
    clubid: process.env.NAVER_CAFE_JEONGSEOKJUN_CLUBID || "",
    menuid: process.env.NAVER_CAFE_JEONGSEOKJUN_MENUID || "",
  },
  {
    id: "sinseonggyu",
    name: "신성규수학연구소",
    clubid: process.env.NAVER_CAFE_SINSEONGGYU_CLUBID || "",
    menuid: process.env.NAVER_CAFE_SINSEONGGYU_MENUID || "",
  },
];

export function getResearchLab(id: string): ResearchLab | null {
  return RESEARCH_LABS.find((l) => l.id === id) ?? null;
}
