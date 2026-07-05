import { getSessionUser } from "@/lib/session";
import { Omr } from "@/components/sections/Omr";

export default async function OmrPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "PARENT") {
    return (
      <div className="pt-8">
        <p className="text-[15px] text-[#161616]/50">OMR 채점은 학생 계정에서 이용할 수 있습니다.</p>
      </div>
    );
  }
  return <Omr />;
}
