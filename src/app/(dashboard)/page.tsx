import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">欢迎来到主页面</h1>
          <p className="text-muted-foreground text-lg">
            这是中间内容区域，您可以在这里放置主要内容
          </p>
          {session?.user && (
            <div className="bg-muted/30 mt-8 rounded-lg p-4">
              <p className="text-sm">
                当前用户: {session.user.name || session.user.email}
              </p>
            </div>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
