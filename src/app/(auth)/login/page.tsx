import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full max-w-[400px]">
      <div className="text-center mb-6">
        <h1 className="text-[28px] font-bold tracking-tight mb-1">Добре дошъл обратно</h1>
        <p className="text-[13px] text-ink-3">Влез за да продължиш със своя outreach</p>
      </div>
      <div className="card p-6">
        <LoginForm />
      </div>
      <p className="text-center text-[12.5px] text-ink-3 mt-4">
        Нямаш акаунт? <a href="/signup" className="text-red font-semibold hover:underline">Регистрирай се</a>
      </p>
    </div>
  );
}
