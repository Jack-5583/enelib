export function Chip({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-[11px] py-[5px] text-[13px] leading-[20px]" : "px-4 py-2 text-[16px] leading-[24px]";
  return (
    <button
      onClick={onClick}
      className={`flex-none whitespace-nowrap rounded-[2px] border ${pad} ${
        active ? "border-[#161616] bg-[#161616] text-white" : "border-[#c6c6c6] bg-white text-[#393939]"
      }`}
    >
      {children}
    </button>
  );
}
