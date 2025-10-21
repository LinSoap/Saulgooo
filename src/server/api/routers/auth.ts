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

      // 使用 bcrypt 加密密码
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
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
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new Error("用户不存在");
      }

      // 直接更新密码（无需验证旧密码）
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await db.user.update({
        where: { email: input.email },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),
});