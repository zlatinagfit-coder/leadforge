/**
 * LeadForge brand mark
 *
 * Концепция:
 *   - LF монограм в bold (бяло на черно — премиум, sharp)
 *   - Червена стрелка/dart в горния десен ъгъл — "lead идва ВЪТРЕ в платформата"
 *   - Малки искри (sparks) под буквите — forge метафора (изковаваме lead-ове)
 */

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Black rounded square */}
      <rect width="32" height="32" rx="7" fill="#0A0A0A" />

      {/* Subtle inner ring — forge feel */}
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.12" />

      {/* LF monogram — bold, tight kerning */}
      <text
        x="16"
        y="21.5"
        fontFamily="Manrope, Inter, system-ui, sans-serif"
        fontSize="13.5"
        fontWeight="800"
        fill="#FFFFFF"
        textAnchor="middle"
        letterSpacing="-0.6"
      >
        LF
      </text>

      {/* Incoming-lead arrow (red dart entering from top-right corner) */}
      <g>
        {/* Arrow shaft */}
        <line
          x1="27.5"
          y1="4.5"
          x2="22"
          y2="10"
          stroke="#E10C2F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Arrow head — tip touches the LF area */}
        <path
          d="M22.6 8.2 L22 10 L23.8 9.4"
          fill="#E10C2F"
          stroke="#E10C2F"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {/* Two tail feathers — gives it speed/motion feel */}
        <line x1="29" y1="3" x2="27" y2="5" stroke="#E10C2F" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="29" y1="6" x2="27.5" y2="7.5" stroke="#E10C2F" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* Tiny spark under LF — forge metaphor */}
      <circle cx="11" cy="26.5" r="0.7" fill="#E10C2F" opacity="0.8" />
      <circle cx="21" cy="26.5" r="0.7" fill="#E10C2F" opacity="0.6" />
      <circle cx="16" cy="27" r="0.5" fill="#E10C2F" opacity="0.5" />
    </svg>
  );
}

export function BrandFull({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <BrandMark size={34} />
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight">
          Lead<span className="text-red">Forge</span>
        </div>
        <div className="text-[9.5px] mono text-ink-4 uppercase tracking-[0.14em] font-semibold">
          {workspaceName}
        </div>
      </div>
    </div>
  );
}

/** Larger version за login/signup/landing страница */
export function BrandHero({ size = 80 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <BrandMark size={size} />
      <div className="text-center">
        <div className="text-[28px] font-bold tracking-tight leading-none">
          Lead<span className="text-red">Forge</span>
        </div>
        <div className="text-[11px] mono text-ink-4 uppercase tracking-[0.2em] mt-1">
          AI lead generation, forged at scale
        </div>
      </div>
    </div>
  );
}
