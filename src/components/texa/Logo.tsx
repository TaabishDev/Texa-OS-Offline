export function Logo({ className = "h-6 w-6 text-[#ea580c]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 35 30 L 70 30 L 60 40 L 46 40 L 55 48 L 55 70 L 45 62 L 45 48 L 30 40 Z" />
    </svg>
  );
}
