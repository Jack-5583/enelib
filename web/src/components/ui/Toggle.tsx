export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative h-[26px] w-[44px] flex-none rounded-full border-none p-0 transition-colors"
      style={{ background: on ? "#161616" : "#e2e2e2" }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: on ? 21 : 3 }}
      />
    </button>
  );
}
