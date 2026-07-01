export function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[2px] border text-[13px] text-white"
      style={{
        borderColor: checked ? "#161616" : "#c6c6c6",
        background: checked ? "#161616" : "#fff",
      }}
    >
      {checked ? "✓" : ""}
    </button>
  );
}
