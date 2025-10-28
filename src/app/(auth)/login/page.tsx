"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  // Separate loading states: login uses local loading, register uses mutation's loading
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const loginPasswordRef = useRef<HTMLInputElement>(null);

  const registerMutation = api.auth.register.useMutation({
    onSuccess: (data) => {
      setError("");
      toast.success("注册成功！正在跳转到登录...", {
        duration: 2000,
      });
      setPrefilledEmail(data.email ?? "");
      setTimeout(() => {
        setActiveTab("login");
        toast.info("已自动填充您的邮箱，请输入密码登录");
      }, 1500);
    },
    onError: (error) => {
      setError(error.message);
      toast.error(error.message);
    },
  });

  const loginForm = useForm<{
    email: string;
    password: string;
    remember?: boolean;
  }>({
    defaultValues: { email: prefilledEmail, password: "", remember: false },
  });
  const loginPasswordRegister = loginForm.register("password", {
    required: true,
  });

  const onSubmitLogin = async (values: {
    email: string;
    password: string;
    remember?: boolean;
  }) => {
    setLoginLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        remember: values.remember,
      });

      if (result?.error) {
        setError("登录失败，请检查邮箱和密码");
        toast.error("登录失败，请检查邮箱和密码");
        // 清空密码字段
        loginForm.setValue("password", "");
        // 聚焦密码输入框
        if (loginPasswordRef.current) {
          loginPasswordRef.current.focus();
        }
      } else {
        router.push("/");
      }
    } catch {
      setError("登录过程中出现错误");
      toast.error("登录过程中出现错误");
      // 清空密码字段
      loginForm.setValue("password", "");
      // 聚焦密码输入框
      if (loginPasswordRef.current) {
        loginPasswordRef.current.focus();
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // react-hook-form for register
  const registerForm = useForm<{
    name?: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // Update loginPasswordRef when form field ref changes
  useEffect(() => {
    const fieldRef = loginPasswordRegister.ref as unknown;
    if (fieldRef && typeof fieldRef === 'object' && 'current' in fieldRef) {
      loginPasswordRef.current = (fieldRef as React.RefObject<HTMLInputElement>).current;
    }
  }, [loginPasswordRegister]);

  const onSubmitRegister = (values: {
    name?: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setError("");
    if (values.password !== values.confirmPassword) {
      setError("两次输入的密码不一致");
      toast.error("两次输入的密码不一致");
      return;
    }

    if (values.password.length < 6) {
      setError("密码长度至少为6位");
      toast.error("密码长度至少为6位");
      return;
    }

    registerMutation.mutate({
      email: values.email,
      password: values.password,
      name: values.name ?? undefined,
    });
  };

  // 监听tab切换，当切换到登录且有预填充邮箱时自动聚焦密码框
  useEffect(() => {
    if (activeTab === "login" && prefilledEmail && loginPasswordRef.current) {
      loginPasswordRef.current.focus();
    }
  }, [activeTab, prefilledEmail]);

  return (
    <>
      <Toaster />
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-foreground mt-6 text-3xl font-bold">
              欢迎使用
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              登录或注册您的账户
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border p-3 text-sm">
              {error}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                onSubmit={loginForm.handleSubmit(onSubmitLogin)}
                className="mt-6 space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱地址</Label>
                    <Input
                      id="login-email"
                      {...loginForm.register("email", { required: true })}
                      type="email"
                      autoComplete="email"
                      placeholder="请输入邮箱地址"
                      className="w-full"
                    />
                    {prefilledEmail && (
                      <p className="text-xs text-green-600">
                        已自动填充注册邮箱
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      {...loginPasswordRegister}
                      type="password"
                      autoComplete="current-password"
                      placeholder="请输入密码"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    {...loginForm.register("remember")}
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    记住我
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                onSubmit={registerForm.handleSubmit(onSubmitRegister)}
                className="mt-6 space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">姓名（可选）</Label>
                    <Input
                      id="register-name"
                      {...registerForm.register("name")}
                      type="text"
                      placeholder="请输入姓名"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">邮箱地址</Label>
                    <Input
                      id="register-email"
                      {...registerForm.register("email", { required: true })}
                      type="email"
                      autoComplete="email"
                      placeholder="请输入邮箱地址"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      {...registerForm.register("password", {
                        required: true,
                        minLength: 6,
                      })}
                      type="password"
                      autoComplete="new-password"
                      placeholder="请输入密码（至少6位）"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">确认密码</Label>
                    <Input
                      id="register-confirm-password"
                      {...registerForm.register("confirmPassword", {
                        required: true,
                        minLength: 6,
                      })}
                      type="password"
                      autoComplete="new-password"
                      placeholder="请再次输入密码"
                      className="w-full"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.status === "pending"}
                >
                  {registerMutation.status === "pending" ? "注册中..." : "注册"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
