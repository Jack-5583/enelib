export interface CafeBoard {
  id: string;
  name: string;
  menuid: string;
  /** inclass only: the board path segment (e.g. "boardQnAS", "boardQnA2"). */
  path?: string;
}

export interface ResearchLab {
  id: string;
  name: string;
  /** Subject is fixed per lab and shown on the question automatically. */
  subject: string;
  /** "naver" labs post to a Naver Cafe via the Open API; "hohoon" posts to
   * hohoonmath.com via its login/captcha flow; "inclass" posts to an inclass
   * board (e.g. gomathtop/tigerchan.inclass.co.kr) via a shared cookie session. */
  kind: "naver" | "hohoon" | "inclass";
  clubid?: string;
  /** inclass only: the site origin, e.g. "https://tigerchan.inclass.co.kr". */
  host?: string;
  homeUrl?: string;
  boards: CafeBoard[];
}

// Cafe/board IDs aren't secrets — they're just which cafe & board this app
// posts questions into, so they're checked in directly rather than via env vars.
export const RESEARCH_LABS: ResearchLab[] = [
  {
    id: "singugeo",
    name: "신국어연구소",
    subject: "국어",
    kind: "naver",
    clubid: "31113195",
    homeUrl: "https://cafe.naver.com/mysclass",
    boards: [{ id: "qna", name: "질문 게시판", menuid: "55" }],
  },
  {
    id: "jeongseokjun",
    name: "정석준연구소",
    subject: "생명과학1",
    kind: "naver",
    clubid: "31342990",
    homeUrl: "https://cafe.naver.com/jsjls",
    boards: [
      { id: "s1-crossout", name: "시즌1 크로스아웃", menuid: "55" },
      { id: "s1-decode", name: "시즌1 디코드", menuid: "56" },
      { id: "s1-review", name: "시즌1 복습테스트", menuid: "57" },
      { id: "s2-synchro", name: "시즌2 싱크로", menuid: "64" },
      { id: "s2-decode", name: "시즌2 디코드", menuid: "65" },
      { id: "s3-tricky", name: "시즌3 트리키", menuid: "71" },
      { id: "s3-decode", name: "시즌3 디코드", menuid: "75" },
      { id: "s4-decode", name: "시즌4 디코드", menuid: "78" },
      { id: "lecture-circuit", name: "특강 써킷", menuid: "70" },
      { id: "mock-insilmo-b", name: "모의고사 인실모B", menuid: "66" },
      { id: "mock-insilmo-l", name: "모의고사 인실모L", menuid: "72" },
      { id: "mock-insilmo-p", name: "모의고사 인실모P", menuid: "68" },
      { id: "mock-circuit", name: "모의고사 써킷", menuid: "74" },
      { id: "mock-gangk", name: "모의고사 강K", menuid: "77" },
      { id: "mock-pyeongawon", name: "모의고사 평가원", menuid: "16" },
      { id: "mock-gyoyukcheong", name: "모의고사 교육청", menuid: "17" },
      { id: "encode", name: "인코드", menuid: "59" },
    ],
  },
  {
    id: "sinseonggyu",
    name: "신성규수학연구소",
    subject: "수학",
    kind: "naver",
    clubid: "31112706",
    homeUrl: "https://cafe.naver.com/ssgmath",
    boards: [
      { id: "sinseonhae", name: "신선해/신기해/신비해/신박해", menuid: "5" },
      { id: "ssg-union-mock", name: "SSG/UNION 모의고사", menuid: "8" },
      { id: "holydays", name: "HOLYDAYS/HOLIC/BOLD", menuid: "9" },
      { id: "gichul", name: "기출 (평가원/교사경)", menuid: "10" },
      { id: "omega-alpha-mock", name: "OMEGA/ALPHA 모의고사", menuid: "11" },
      { id: "jeondae-deope-mock", name: "전대실모/더프 모의고사", menuid: "27" },
      { id: "external", name: "외부문항", menuid: "21" },
      { id: "ebs-2027", name: "2027 EBS (수특/수완)", menuid: "12" },
      { id: "concept", name: "개념", menuid: "14" },
    ],
  },
  {
    id: "hohoon",
    name: "호형훈제수학연구소",
    subject: "수학",
    kind: "hohoon",
    homeUrl: "https://www.hohoonmath.com/weekly/studyquestions.html",
    boards: [{ id: "studyquestions", name: "학습질문", menuid: "" }],
  },
  {
    id: "parkjongmin",
    name: "박종민수학연구소",
    subject: "수학",
    kind: "inclass",
    host: "https://gomathtop.inclass.co.kr",
    homeUrl: "https://gomathtop.inclass.co.kr/boardQnAS/list/?siteMenuIdx=137567",
    boards: [{ id: "qna", name: "수학 질문", menuid: "137567", path: "boardQnAS" }],
  },
  {
    id: "kimbeomchan",
    name: "김범찬수학연구소",
    subject: "수학",
    kind: "inclass",
    host: "https://tigerchan.inclass.co.kr",
    homeUrl: "https://tigerchan.inclass.co.kr/boardQnAS/list/?siteMenuIdx=146091",
    boards: [
      { id: "internal", name: "[내부] Q&A", menuid: "146091", path: "boardQnAS" },
      { id: "external", name: "[외부] Q&A", menuid: "146092", path: "boardQnA2" },
      { id: "survival", name: "[서바이벌] Q&A", menuid: "146093", path: "boardQnA4" },
      { id: "counsel", name: "[김범찬] 상담소", menuid: "146094", path: "boardQnA3" },
    ],
  },
];

export function getResearchLab(id: string): ResearchLab | null {
  return RESEARCH_LABS.find((l) => l.id === id) ?? null;
}

export function getResearchLabBoard(labId: string, boardId: string): { lab: ResearchLab; board: CafeBoard } | null {
  const lab = getResearchLab(labId);
  const board = lab?.boards.find((b) => b.id === boardId);
  if (!lab || !board) return null;
  return { lab, board };
}
