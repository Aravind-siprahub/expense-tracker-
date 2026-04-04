interface CardProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Card({ title, subtitle, className }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
