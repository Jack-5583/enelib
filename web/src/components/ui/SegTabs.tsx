export function SegTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex w-full pt-8 lg:pt-8">
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative flex-1 border border-[#16161614] py-[15px] text-center text-[15px] leading-6 lg:py-[18px] lg:text-[16px] lg:leading-7 ${
              i !== 0 ? "-ml-px" : ""
            } ${active ? "z-10 bg-white text-[#161616]" : "bg-[#f4f4f4] text-[#161616]/50 opacity-90"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
