export function Sheet({
  open,
  onClose,
  children,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#161616]/40 lg:items-center lg:p-10">
      <button onClick={onClose} className="absolute inset-0 border-none bg-none" aria-label="닫기" />
      <div
        className="relative flex max-h-[85%] w-full flex-col overflow-hidden bg-white lg:max-h-[86%]"
        style={{ maxWidth }}
      >
        <div className="flex flex-none items-center justify-center pt-2.5 pb-1 lg:hidden">
          <span className="h-1 w-9 rounded-full bg-[#e2e2e2]" />
        </div>
        <div className="scrollbar-hide flex-1 overflow-y-auto px-6 pt-2 pb-8 lg:px-10 lg:pt-10 lg:pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}
