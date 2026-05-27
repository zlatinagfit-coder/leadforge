import { signupAction } from "@/lib/auth-actions";
import { SignupForm } from "@/components/SignupForm";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const session = await auth();
  // Only redirect if session points to a user that actually exists in DB
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) redirect("/");
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="text-center mb-6">
        <h1 className="text-[28px] font-bold tracking-tight mb-1">Започни безплатно</h1>
        <p className="text-[13px] text-ink-3">
          14-дневен trial · без карта · веднага в action
        </p>
      </div>
      <div className="card p-6">
        <SignupForm action={signupAction} />
      </div>
      <p className="text-center text-[12.5px] text-ink-3 mt-4">
        Имаш акаунт? <a href="/login" className="text-red font-semibold hover:underline">Влез</a>
      </p>
    </div>
  );
}
