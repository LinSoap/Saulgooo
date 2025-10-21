import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // 检查用户是否已存在
      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("用户已存在");
      }

      // 注意：这里简化了密码处理，仅保存明文密码用于演示
      // 在生产环境中，你应该使用bcrypt等加密库
      const user = await db.user.create({
        data: {
          email: input.email,
          password: input.password, // 注意：生产环境中应该加密
          name: input.name,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        oldPassword: z.string(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      if (!user || !user.password) {
        throw new Error("用户不存在");
      }

      // 验证旧密码（简单明文比较，仅用于演示）
      if (input.oldPassword !== user.password) {
        throw new Error("旧密码错误");
      }

      // 更新密码（注意：生产环境中应该加密）
      await db.user.update({
        where: { email: input.email },
        data: { password: input.newPassword },
      });

      return { success: true };
    }),
});