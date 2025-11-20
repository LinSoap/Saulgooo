"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowRight,
  Mail,
  Lock,
  User,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  // Separate loading states: login uses local loading, register uses mutation's loading
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const isLogin = activeTab === "login";
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
        callbackUrl: "/",
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
      }
      // 如果登录成功，NextAuth 会自动跳转到 callbackUrl 指定的页面
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
    if (fieldRef && typeof fieldRef === "object" && "current" in fieldRef) {
      loginPasswordRef.current = (
        fieldRef as React.RefObject<HTMLInputElement>
      ).current;
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
      <div className="text-brand-black selection:bg-brand-black flex min-h-screen w-full bg-white font-sans selection:text-white">
        {/* Left Panel - Brand & Philosophy (Hidden on mobile) */}
        <div className="bg-brand-black relative hidden flex-col justify-between overflow-hidden p-12 text-white md:p-16 lg:flex lg:w-1/2">
          {/* Logo */}
          <div className="z-10 flex w-fit cursor-pointer items-center gap-3">
            <div className="rounded-xl bg-white p-2">
              <GraduationCap className="h-6 w-6 text-black" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight">
              Saulgooo
            </span>
          </div>

          {/* Central Quote */}
          <div className="relative z-10 max-w-xl">
            <h2 className="mb-8 font-serif text-4xl leading-tight md:text-5xl">
              {isLogin
                ? "Education is the kindling of a flame, not the filling of a vessel."
                : "Join a community of educators shaping the future of academia."}
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-12 bg-white/30"></div>
              <p className="text-sm tracking-widest text-gray-400 uppercase">
                {isLogin ? "Socrates" : "Saulgooo Faculty Network"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="z-10 flex gap-6 text-xs text-gray-500">
            <span>© 2025 Saulgooo Academic</span>
            <a href="#" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Terms of Service
            </a>
          </div>

          {/* Abstract Background Decoration */}
          <div className="pointer-events-none absolute top-1/2 right-0 h-[800px] w-[800px] translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl"></div>
          <div className="bg-brand-accent/10 pointer-events-none absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"></div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-12 lg:p-24">
          {/* Mobile Logo */}
          <div className="mb-12 flex items-center gap-2 lg:hidden">
            <GraduationCap className="h-8 w-8 text-black" />
            <span className="font-serif text-2xl font-bold">Saulgooo</span>
          </div>

          <div className="w-full max-w-md space-y-10">
            <div className="text-center lg:text-left">
              <h1 className="mb-3 text-3xl font-bold">
                {isLogin ? "欢迎回来，教授。" : "开启智能教学之旅"}
              </h1>
              <p className="text-gray-500">
                {isLogin
                  ? "请输入您的凭证以访问学术空间。"
                  : "创建一个账户，开始体验 AI 驱动的课程设计。"}
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
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  onSubmit={loginForm.handleSubmit(onSubmitLogin)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      电子邮箱
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...loginForm.register("email", { required: true })}
                        type="email"
                        placeholder="professor@edu.cn"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="ml-1 flex items-center justify-between">
                      <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                        密码
                      </label>
                      <a
                        href="#"
                        className="text-xs font-medium text-gray-900 hover:underline"
                      >
                        忘记密码?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...loginPasswordRegister}
                        type="password"
                        placeholder="••••••••"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading}
                  >
                    {loginLoading ? "登录中..." : "安全登录"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  onSubmit={registerForm.handleSubmit(onSubmitRegister)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      姓名
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...registerForm.register("name")}
                        type="text"
                        placeholder="张教授"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      电子邮箱
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...registerForm.register("email", { required: true })}
                        type="email"
                        placeholder="professor@edu.cn"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...registerForm.register("password", {
                          required: true,
                          minLength: 6,
                        })}
                        type="password"
                        placeholder="••••••••"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      确认密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        {...registerForm.register("confirmPassword", {
                          required: true,
                          minLength: 6,
                        })}
                        type="password"
                        placeholder="••••••••"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.status === "pending"}
                  >
                    {registerMutation.status === "pending"
                      ? "注册中..."
                      : "创建账户"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">或者</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                {isLogin ? "还没有账户？" : "已有账户？"}
                <button
                  onClick={() => setActiveTab(isLogin ? "register" : "login")}
                  className="text-brand-black ml-1 font-bold underline-offset-4 hover:underline"
                >
                  {isLogin ? "立即注册" : "直接登录"}
                </button>
              </p>
            </div>
          </div>

          {/* Features micro-list for Register page */}
          {!isLogin && (
            <div className="mt-12 w-full max-w-md border-t border-gray-50 pt-8">
              <p className="mb-4 text-center text-xs font-bold tracking-widest text-gray-400 uppercase">
                加入即可获得
              </p>
              <div className="flex justify-between text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> AI
                  课程生成
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />{" "}
                  科研辅助工具
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />{" "}
                  社区资源库
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
