export default function MalgudiLogo({
  size = 40,
  color = "#F05A28",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Malgudi"
    >
      {/* Left arch */}
      <path
        d="M8 75 C8 75 8 25 30 25 C52 25 48 60 50 60 C52 60 48 25 70 25 C92 25 92 75 92 75"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Small dot left */}
      <circle
        cx="28"
        cy="52"
        r="4"
        fill={color}
      />
      {/* Teardrop center */}
      <ellipse
        cx="50"
        cy="48"
        rx="4"
        ry="6"
        fill={color}
      />
    </svg>
  );
}
