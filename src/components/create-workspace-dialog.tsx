import { api } from "~/trpc/react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const utils = api.useUtils();
  const createWorkSpaceMutation = api.workspace.createWorkSpace.useMutation({
    onSuccess: (data) => {
      setError("");
      toast.success("工作空间创建成功", { duration: 1000 });
      setOpen(false);
      createWorkSpaceForm.reset();
      // 刷新workspace列表
      utils.workspace.getWorkSpaces.invalidate();
    },
    onError: (error) => {
      setError("创建工作空间失败: " + error.message);
      toast.error("创建工作空间失败", { duration: 1000 });
    },
  });

  const createWorkSpaceForm = useForm<{
    name: string;
    description?: string;
  }>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: { name: string; description?: string }) => {
    console.log("Creating workspace with data:", data);
    createWorkSpaceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">创建工作空间</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={createWorkSpaceForm.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>创建工作空间</DialogTitle>
            <DialogDescription>
              输入工作空间名称和描述，然后点击保存。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                {...createWorkSpaceForm.register("name", {
                  required: true,
                  minLength: 2,
                  maxLength: 100,
                })}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                {...createWorkSpaceForm.register("description", {
                  required: true,
                  minLength: 1,
                  maxLength: 500,
                })}
              />
            </div>
            <div className="text-error text-sm">{error}</div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
