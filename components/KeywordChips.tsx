type KeywordChipsProps = {
  keywords?: string[] | null;
  className?: string;
};

export default function KeywordChips({
  keywords,
  className = "",
}: KeywordChipsProps) {
  if (!keywords || keywords.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {keywords.map((keyword) => (
        <span key={keyword} className="chip text-xs">
          #{keyword.replace(/^#/, "")}
        </span>
      ))}
    </div>
  );
}
