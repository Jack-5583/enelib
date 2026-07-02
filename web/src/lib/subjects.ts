export const SUBJECTS = ["국어", "수학", "영어", "생명과학1", "지구과학1", "한국사", "기타"];

const DEFAULT_MAX_SCORE: Record<string, number> = {
  국어: 100,
  수학: 100,
  영어: 100,
  생명과학1: 50,
  지구과학1: 50,
  한국사: 50,
};

export function defaultMaxScoreFor(subject: string): number {
  return DEFAULT_MAX_SCORE[subject] ?? 100;
}
