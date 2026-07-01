export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[2px] border border-[#c6c6c6] bg-[#f4f4f4] px-1.5 text-sm leading-6 font-semibold text-[#393939]">
      {children}
    </span>
  );
}
