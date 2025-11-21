"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { User, Shield, Save, Eye, EyeOff, Loader2, Lock } from "lucide-react";

type SettingsTab = "profile" | "security";

interface ProfileForm {
  name: string;
  institution: string;
  bio: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const tabs = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "security", label: "安全与隐私", icon: Shield },
  ];

  // 获取用户资料
  const { data: profile, refetch: refetchProfile } =
    api.user.getProfile.useQuery();

  // 更新用户资料 Mutation
  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("个人资料已更新");
      void refetchProfile();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 修改密码 Mutation
  const changePasswordMutation = api.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密码已修改");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) => {
      toast.error(`修改失败: ${error.message}`);
    },
  });

  // 表单处理
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
  } = useForm<ProfileForm>();

  // 初始化表单数据
  useEffect(() => {
    if (profile) {
      resetProfile({
        name: profile.name ?? "",
        institution: profile.institution ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile, resetProfile]);

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast.error("请输入当前密码和新密码");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      <div className="mb-10">
        <h2 className="mb-2 font-serif text-gray-400 italic">Configuration</h2>
        <h1 className="text-brand-black text-4xl font-bold tracking-tight">
          设置
        </h1>
      </div>

      <div className="flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
        {/* Sidebar Settings Nav */}
        <div className="w-full shrink-0 space-y-2 md:w-64">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-brand-black scale-105 transform text-white shadow-lg shadow-gray-300"
                  : "hover:text-brand-black text-gray-500 hover:bg-white hover:shadow-sm"
              }`}
            >
              <tab.icon
                className={`h-4 w-4 ${activeTab === tab.id ? "text-white" : "text-gray-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 min-w-0 flex-1 duration-500">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <form
              onSubmit={handleSubmitProfile(onProfileSubmit)}
              className="space-y-6"
            >
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-brand-black flex items-center gap-3 text-xl font-bold">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    基本信息
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gray-200 text-xl font-bold text-gray-500 shadow-sm">
                      {profile.name?.substring(0, 2).toUpperCase() ?? "USER"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      姓名
                    </label>
                    <input
                      type="text"
                      {...registerProfile("name")}
                      className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      所属院校
                    </label>
                    <input
                      type="text"
                      {...registerProfile("institution")}
                      placeholder="例如：科技大学"
                      className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      个人简介
                    </label>
                    <textarea
                      rows={4}
                      {...registerProfile("bio")}
                      placeholder="简要介绍您的学术背景和研究方向..."
                      className="focus:ring-brand-black w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-brand-black hover:bg-brand-dark flex items-center gap-2 rounded-full px-8 py-4 font-medium text-white shadow-lg transition-all hover:-translate-y-1 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存更改
                </button>
              </div>
            </form>
          )}

          {/* SECURITY SETTINGS TAB */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 flex items-center gap-3 text-xl font-bold">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Lock className="h-5 w-5 text-gray-600" />
                  </div>
                  登录安全
                </h2>

                <div className="grid max-w-md grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      当前密码
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      新密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="输入新密码"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-brand-black absolute top-1/2 right-4 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={onChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="bg-brand-black hover:bg-brand-dark w-full rounded-xl py-3 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  >
                    {changePasswordMutation.isPending
                      ? "更新中..."
                      : "更新密码"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
