import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AiAgentPanel } from "@/components/AiAgentPanel";
import { getCurrentWorkspace, getCurrentUser } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [workspace, user, activity] = await Promise.all([
    getCurrentWorkspace(),
    getCurrentUser(),
    (async () => {
      const ws = await getCurrentWorkspace();
      return prisma.aiActivity.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    })(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        workspaceName={workspace.name}
        userName={user.name ?? user.email.split("@")[0]}
        userEmail={user.email}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar workspaceName={workspace.name} />
        <div className="flex-1 min-w-0">{children}</div>
      </main>
      <AiAgentPanel
        activity={activity.map((a) => ({
          id: a.id,
          kind: a.kind,
          tag: a.tag,
          text: a.text,
          createdAt: a.createdAt,
        }))}
        queueCount={14}
      />
    </div>
  );
}
