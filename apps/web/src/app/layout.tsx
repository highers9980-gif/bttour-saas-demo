import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ToastProvider } from '@bttour/ui';
import '@bttour/ui/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BT TOUR ERP',
    template: '%s | BT TOUR ERP',
  },
  description: '인바운드 여행사 전용 통합 정산 SaaS — 한·중·베트남 동시 지원',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-white text-slate-900 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
