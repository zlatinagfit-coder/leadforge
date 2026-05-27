import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-line">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink grid place-items-center text-bg font-bold text-[14px]">LF</div>
          <span className="text-[16px] font-bold tracking-tight">LeadForge</span>
        </Link>
        <nav className="text-[12.5px] text-ink-3">
          <Link href="/login" className="hover:text-ink mr-4">Вход</Link>
          <Link href="/signup" className="hover:text-ink">Регистрация</Link>
        </nav>
      </header>
      <main className="flex-1 grid place-items-center px-6 py-10">{children}</main>
      <footer className="px-6 py-4 text-center text-[11px] text-ink-4 mono border-t border-line">
        © {new Date().getFullYear()} LeadForge · AI Lead Generation
      </footer>
    </div>
  );
}
