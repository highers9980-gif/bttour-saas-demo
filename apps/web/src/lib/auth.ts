import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@bttour/db';
import { z } from 'zod';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * NextAuth v5 (Auth.js) — Phase 1~2 설정.
 *
 * 정책:
 *  - Credentials provider만 활성. JWT 세션 (DB 세션 X).
 *  - PrismaAdapter는 의도적으로 사용하지 않는다.
 *    NextAuth v5에서 Credentials + Adapter 조합은 InvalidProvider 에러를 발생시킴
 *    (Adapter는 OAuth/Email 콜백을 위한 것). User CRUD는 /signup의 Server Action에서
 *    prisma로 직접 처리.
 *  - Phase 3에서 Kakao OAuth + 이메일 매직 링크 추가 시 PrismaAdapter도 그 시점에
 *    함께 재도입한다 (조건부 활성).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(rawCreds) {
        const parsed = credentialsSchema.safeParse(rawCreds);
        if (!parsed.success) return null;

        // Phase 1~2: 비밀번호 검증 미구현 — 존재하는 이메일이면 통과 (개발용).
        // Phase 3에서 bcrypt 해시 검증으로 교체.
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
