type PageShellProps = {
  children: React.ReactNode;
  centered?: boolean;
};

export default function PageShell({
  children,
  centered = false,
}: PageShellProps) {
  return (
    <div className="steel-bg min-h-full flex-1">
      <div
        className={`relative px-6 py-10 ${
          centered ? "flex min-h-full flex-1 items-center justify-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
