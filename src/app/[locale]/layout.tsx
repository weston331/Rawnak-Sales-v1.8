
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Arabic, Cairo, Tajawal, Amiri } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import '../globals.css';
import { UserProvider } from '@/contexts/user-context';
import AppShell from '@/components/layout/app-shell';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-inter',
});

const noto_sans_arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-tajawal',
});

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-amiri',
});


// Using generateMetadata for dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const SaIconSvg = `<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%2329ABE2%22/><text x=%2250%22 y=%2255%22 font-size=%2250%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial, sans-serif%22 font-weight=%22bold%22>Sa</text></svg>`;
  const SaIconDataUri = `data:image/svg+xml,${SaIconSvg}`;

  return {
    title: 'Rawnak Sales',
    description: 'Smart sales management system for store owners in Iraq.',
    applicationName: 'Rawnak Sales',
    keywords: ['sales', 'pos', 'inventory', 'business', 'iraq', 'retail'],
    authors: [{ name: 'Rawnak Sales Team' }],
    creator: 'Rawnak Sales',
    publisher: 'Rawnak Sales',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Rawnak Sales',
      startupImage: '/icons/apple-touch-icon.svg',
    },
    icons: {
      icon: [
        { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
      ],
      shortcut: SaIconDataUri,
      apple: '/icons/apple-touch-icon.svg',
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': 'Rawnak Sales',
      'application-name': 'Rawnak Sales',
      'msapplication-TileColor': '#29ABE2',
      'msapplication-config': '/browserconfig.xml',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#29ABE2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};


interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<RootLayoutProps>) {
  
  const { locale } = await params;
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="manifest" href={`/${locale}/manifest.json`} />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="theme-color" content="#29ABE2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rawnak Sales" />
      </head>
      <body className={`${inter.variable} ${noto_sans_arabic.variable} ${cairo.variable} ${tajawal.variable} ${amiri.variable} font-body antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <UserProvider>
            <AppShell>{children}</AppShell>
          </UserProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
