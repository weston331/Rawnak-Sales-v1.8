
'use client';

import React from 'react';
import { useUser } from '@/contexts/user-context';
import LoginPage from '@/components/auth/login-page';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/app-sidebar';
import AppHeader from '@/components/layout/app-header';
import { Skeleton } from '../ui/skeleton';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { SettingsProvider, useSettings } from '@/contexts/settings-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { ProductProvider } from '@/contexts/product-context';
import { CustomerProvider } from '@/contexts/customer-context';
import { SaleProvider } from '@/contexts/sale-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


const FirebaseWarningBanner = () => {
    const t = useTranslations('General');
    if (isFirebaseConfigured) return null;
    return (
      <a 
        href="https://console.firebase.google.com/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="bg-destructive text-destructive-foreground p-2 text-center text-sm flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors"
        title={t('firebaseNotConfiguredTooltip')}
      >
        <AlertTriangle className="h-4 w-4" />
        {t('firebaseNotConfigured')}
      </a>
    );
};

// This is the main application shell, rendered only when the user is logged in
// and all essential providers are ready.
const MainAppShell = ({ children }: { children: React.ReactNode }) => {
    return (
      <ProductProvider>
        <CustomerProvider>
            <SaleProvider>
                <SidebarProvider defaultOpen={true} collapsible="icon">
                    <div className={cn("flex min-h-screen w-full")}>
                        <AppSidebar />
                        <div className="flex flex-col flex-1 min-w-0">
                        <AppHeader />
                        <main className="flex-1">
                            <FirebaseWarningBanner />
                            <div className="p-4 md:p-6 lg:p-8">
                            {children}
                            </div>
                        </main>
                        </div>
                    </div>
                </SidebarProvider>
            </SaleProvider>
        </CustomerProvider>
      </ProductProvider>
    );
};


// This component handles the initial loading, auth state, and provider setup.
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isInitialized: isUserInitialized } = useUser();
  const { isInitialized: isSettingsInitialized } = useSettings();
  const isMobile = useIsMobile();
  
  const isAppReady = isUserInitialized && isSettingsInitialized && isMobile !== undefined;

  if (!isAppReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
        <>
            <FirebaseWarningBanner />
            <LoginPage />
        </>
    );
  }

  // User is logged in and base settings are ready, render the full app shell with all data providers.
  return <MainAppShell>{children}</MainAppShell>;
};


// AppShell's primary role is to set up the essential providers (User, Settings, Currency)
// and then delegate to the AppInitializer.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <CurrencyProvider>
          <AppInitializer>{children}</AppInitializer>
      </CurrencyProvider>
    </SettingsProvider>
  );
}
