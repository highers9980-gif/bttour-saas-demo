'use client';

import NextLink from 'next/link';
import type { ReactNode } from 'react';

/**
 * @bttour/ui의 Sidebar 등에서 LinkComponent 슬롯에 주입할 수 있도록
 * Next.js Link를 컴포넌트 시그니처 통일 형태로 래핑.
 */
export function AppLink({
  href,
  className,
  onClick,
  'aria-current': ariaCurrent,
  children,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  'aria-current'?: 'page';
  children: ReactNode;
}) {
  return (
    <NextLink href={href} className={className} onClick={onClick} aria-current={ariaCurrent}>
      {children}
    </NextLink>
  );
}
