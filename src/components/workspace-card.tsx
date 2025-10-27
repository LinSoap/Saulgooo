"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Users, Calendar, ArrowRight, Plus, Settings } from "lucide-react";
import { cn } from "~/lib/utils";
import { WorkspaceSettingsDialog } from "~/components/workspace-settings-dialog";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: "owner" | "teacher" | "student";
  updatedAt: Date;
  path?: string;
  className?: string;
  onUpdate?: (workspace: any) => void;
  onDelete?: (workspaceId: string) => void;
}

export function WorkspaceCard({
  id,
  name,
  description,
  memberCount,
  role,
  updatedAt,
  path,
  className,
  onUpdate,
  onDelete,
}: WorkspaceCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-primary text-primary-foreground";
      case "teacher":
        return "bg-secondary text-secondary-foreground";
      case "student":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "owner":
        return "拥有者";
      case "teacher":
        return "教师";
      case "student":
        return "学生";
      default:
        return "成员";
    }
  };

  return (
    <Card
      className={cn(
        "transition-shadow duration-200 hover:shadow-lg",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            {description && (
              <CardDescription className="line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", getRoleColor(role))}>
              {getRoleText(role)}
            </Badge>
            <WorkspaceSettingsDialog
              workspace={{
                id,
                name,
                description,
                role,
                memberCount,
                updatedAt,
                path: path || "",
              }}
              onUpdate={onUpdate}
              onDelete={onDelete}
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </WorkspaceSettingsDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{memberCount} 成员</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{updatedAt.toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/workspace/${id}`} className="w-full">
          <Button className="w-full">
            进入工作空间
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

interface CreateWorkspaceCardProps {
  className?: string;
}

export function CreateWorkspaceCard({ className }: CreateWorkspaceCardProps) {
  return (
    <Card
      className={cn(
        "hover:border-primary/50 group cursor-pointer border-dashed transition-colors duration-200",
        className,
      )}
    >
      <CardContent className="flex h-full min-h-[200px] flex-col items-center justify-center">
        <div className="bg-primary/10 group-hover:bg-primary/20 flex h-16 w-16 items-center justify-center rounded-full transition-colors">
          <Plus className="text-primary h-8 w-8" />
        </div>
        <div className="mt-4 text-center">
          <h3 className="font-semibold">创建工作空间</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            创建一个新的教研空间
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
