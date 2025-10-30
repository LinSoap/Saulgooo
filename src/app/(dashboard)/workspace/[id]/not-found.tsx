import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <FileQuestion className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 className="mb-2 text-2xl font-semibold">Workspace Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The workspace you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access to it.
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
