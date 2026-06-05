"use client";

import Image from "next/image";

export default function MalgudiLogo({
  size = 44,
}: {
  size?: number;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <Image
        src="/malgudi-logo.png"
        alt="Malgudi"
        width={size}
        height={size}
        priority
        style={{
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}
