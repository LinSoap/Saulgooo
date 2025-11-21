import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { hash, compare } from "bcryptjs";

export const userRouter = createTRPCRouter({
  // 获取用户资料
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        institution: true,
        bio: true,
      },
    });
    return user;
  }),

  // 更新用户资料
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        institution: z.string().optional(),
        bio: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),

  // 修改密码
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user?.password) {
        throw new Error("User has no password set");
      }

      const isValid = await compare(input.currentPassword, user.password);
      if (!isValid) throw new Error("Invalid current password");

      const hashedPassword = await hash(input.newPassword, 12);

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          password: hashedPassword,
        },
      });
    }),
});
