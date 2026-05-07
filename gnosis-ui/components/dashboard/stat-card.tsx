"use client"

import { useEffect, useRef, useState } from "react"
import { type LucideIcon } from "lucide-react"

type Props = {
  title: string
  value: number
  icon: LucideIcon
  color: "purple" | "blue" | "emerald" | "amber" | "red" | "cyan"
  suffix?: string
}

const colorMap = {
  purple: {
    icon: "text-purple-400",
    iconBg: "bg-purple-500/15",
    glow: "rgba(168, 85, 247, 0.08)",
    gradient: "from-purple-500/10 to-transparent",
    ring: "ring-purple-500/10",
    accent: "text-purple-400",
  },
  blue: {
    icon: "text-blue-400",
    iconBg: "bg-blue-500/15",
    glow: "rgba(59, 130, 246, 0.08)",
    gradient: "from-blue-500/10 to-transparent",
    ring: "ring-blue-500/10",
    accent: "text-blue-400",
  },
  emerald: {
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    glow: "rgba(16, 185, 129, 0.08)",
    gradient: "from-emerald-500/10 to-transparent",
    ring: "ring-emerald-500/10",
    accent: "text-emerald-400",
  },
  amber: {
    icon: "text-amber-400",
    iconBg: "bg-amber-500/15",
    glow: "rgba(245, 158, 11, 0.08)",
    gradient: "from-amber-500/10 to-transparent",
    ring: "ring-amber-500/10",
    accent: "text-amber-400",
  },
  red: {
    icon: "text-red-400",
    iconBg: "bg-red-500/15",
    glow: "rgba(239, 68, 68, 0.08)",
    gradient: "from-red-500/10 to-transparent",
    ring: "ring-red-500/10",
    accent: "text-red-400",
  },
  cyan: {
    icon: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
    glow: "rgba(34, 211, 238, 0.08)",
    gradient: "from-cyan-500/10 to-transparent",
    ring: "ring-cyan-500/10",
    accent: "text-cyan-400",
  },
}

export default function StatCard({ title, value, icon: Icon, color, suffix = "" }: Props) {
  const [displayValue, setDisplayValue] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLDivElement>(null)
  const colors = colorMap[color]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1200
          const steps = 60
          const stepTime = duration / steps
          const increment = value / steps
          let current = 0
          const tick = () => {
            current = Math.min(current + increment, value)
            setDisplayValue(Math.round(current))
            if (current < value) setTimeout(tick, stepTime)
          }
          tick()
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/[0.06] p-5 ring-1 ${colors.ring} transition-all duration-300 hover:border-white/[0.1] hover:shadow-lg group cursor-default`}
      style={{ "--glow-color": colors.glow } as React.CSSProperties}
    >
      {/* Background gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${colors.gradient} rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-3">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-white">
              {displayValue.toLocaleString()}
            </span>
            {suffix && <span className={`text-lg font-semibold ${colors.accent}`}>{suffix}</span>}
          </div>
        </div>
        <div className={`${colors.iconBg} p-2.5 rounded-xl`}>
          <Icon className={colors.icon} size={20} />
        </div>
      </div>
    </div>
  )
}