import { getSessionUser } from "@/lib/session";
import { firstLinkedStudent } from "@/lib/access";
import { Grades } from "@/components/sections/Grades";

export default async function GradesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  if (user.role === "PARENT") {
    const student = await firstLinkedStudent(user.id);
    if (!student) {
      return (
        <div className="pt-8">
          <p className="text-[15px] text-[#161616]/50">연동된 학생이 없습니다. 연동 탭에서 학생 코드를 입력해 주세요.</p>
        </div>
      );
    }
    return (
      <Grades
        studentId={student.id}
        readOnly
        contextLabel={`${student.name} · ${student.schoolLabel} 성적`}
      />
    );
  }

  return <Grades />;
}
