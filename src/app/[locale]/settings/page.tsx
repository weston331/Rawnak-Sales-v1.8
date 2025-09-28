

'use client';

import * as React from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {useTranslations, useLocale} from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building, Palette, Lock, FileText, Coins, GitBranchPlus, CloudUpload, SlidersHorizontal, Trash2, RefreshCw, Image as ImageIcon, Upload, X, Send, ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from '@/contexts/currency-context';
import { currencies as availableCurrencies } from '@/lib/currencies';
import { useSettings, type Branch, type NotificationSettings, type InvoiceSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const DataManagementCard = dynamic(() => import('@/components/settings/data-management-card'), {
  loading: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  ),
  ssr: false,
});


const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) => (
    <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">{value}</span>
            <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 p-1" />
        </div>
    </div>
);


export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  const tg = useTranslations('General');
  const tSidebar = useTranslations('AppSidebar');
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { toast } = useToast();

  // Contexts for data export
  const { currentUser, changePassword, login } = useUser();

  // Local state for form inputs to avoid re-rendering on every keystroke in context
  const [localBranchInfo, setLocalBranchInfo] = React.useState<Branch | null>(null);
  const [localNotifications, setLocalNotifications] = React.useState<NotificationSettings | null>(null);
  const [localInvoiceSettings, setLocalInvoiceSettings] = React.useState<InvoiceSettings | null>(null);

  const [isManageBranchesModalOpen, setIsManageBranchesModalOpen] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState('');
  
  const [branchToDelete, setBranchToDelete] = React.useState<Branch | null>(null);
  const [deletePassword, setDeletePassword] = React.useState('');


  // State for confirming branch switch
  const [isSwitchBranchModalOpen, setIsSwitchBranchModalOpen] = React.useState(false);
  const [targetBranchId, setTargetBranchId] = React.useState<string | null>(null);
  const [switchPassword, setSwitchPassword] = React.useState('');

  // Password change state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  // Settings Context
  const { 
    activeBranch, 
    branches, 
    notificationSettings,
    invoiceSettings,
    updateActiveBranchInfo, 
    updateNotificationSettings,
    updateInvoiceSettings,
    switchBranch,
    addBranch,
    deleteBranch,
    isInitialized
  } = useSettings();


  React.useEffect(() => {
    if (isInitialized && activeBranch) {
      setLocalBranchInfo(activeBranch);
    }
  }, [activeBranch, isInitialized]);

  React.useEffect(() => {
    if (isInitialized) {
      setLocalNotifications(notificationSettings);
    }
  }, [notificationSettings, isInitialized]);

  React.useEffect(() => {
    if (isInitialized) {
      setLocalInvoiceSettings(invoiceSettings);
    }
  }, [invoiceSettings, isInitialized]);

  const handleBranchInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localBranchInfo) return;
    setLocalBranchInfo({ ...localBranchInfo, [e.target.id]: e.target.value });
  };
  
  const handleSaveBranchInfo = () => {
    if (localBranchInfo) {
      updateActiveBranchInfo(localBranchInfo);
      toast({ title: tg('save'), description: t('branchInfoSaved') });
    }
  };

  const handleAddNewBranch = () => {
    if (!newBranchName.trim()) {
      toast({ title: t('errorTitle'), description: t('branchNameRequiredError'), variant: 'destructive'});
      return;
    }
    addBranch(newBranchName.trim())
      .then((newBranch) => {
        if (newBranch) {
            toast({ title: t('successTitle'), description: t('branchAddedSuccess', { branchName: newBranch.name })});
            setNewBranchName('');
        }
      })
      .catch((error) => {
        toast({ title: t('errorTitle'), description: error.message, variant: 'destructive' });
      });
  };
  
  const handleConfirmDeleteBranch = () => {
    if (!branchToDelete || !currentUser) return;

    const authResult = login(currentUser.username, deletePassword);

    if (!authResult.success) {
      toast({ title: t('errorTitle'), description: t('incorrectPasswordError'), variant: 'destructive' });
      return;
    }

    deleteBranch(branchToDelete.id)
      .then(() => {
        toast({ title: t('successTitle'), description: t('branchDeletedSuccess', { branchName: branchToDelete.name }) });
        setBranchToDelete(null);
        setDeletePassword('');
      })
      .catch((error) => {
        toast({ title: t('errorTitle'), description: t((error.message || 'unknownError') as any), variant: 'destructive' });
        setBranchToDelete(null);
        setDeletePassword('');
      });
  };

  const handleNotificationSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localNotifications) return;
    setLocalNotifications({ ...localNotifications, [e.target.id]: e.target.value });
  };

  const handleNotificationSwitchChange = (id: keyof NotificationSettings, checked: boolean) => {
    setLocalNotifications(prev => prev ? ({ ...prev, [id]: checked }) : null);
  }

  const handleSaveNotifications = () => {
    if (localNotifications) {
      updateNotificationSettings(localNotifications);
      toast({ title: tg('save'), description: t('notificationsSaved') });
    }
  };

  const handleInvoiceSettingsChange = (key: keyof InvoiceSettings, value: any) => {
    setLocalInvoiceSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 1 * 1024 * 1024) { // 1MB size limit
            toast({
                title: t('errorTitle'),
                description: t('logoSizeError'),
                variant: "destructive"
            });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            handleInvoiceSettingsChange('logoUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveInvoiceSettings = () => {
    if (localInvoiceSettings) {
      updateInvoiceSettings(localInvoiceSettings);
      toast({ title: tg('save'), description: t('invoiceSettingsSaved') });
    }
  };

  const handleSelectBranchToSwitch = (branchId: string) => {
    if (branchId === activeBranch?.id) return;
    setTargetBranchId(branchId);
    setIsSwitchBranchModalOpen(true);
  };
  
  const handleConfirmSwitchBranch = () => {
    if (!currentUser || !targetBranchId) return;

    const authResult = login(currentUser.username, switchPassword);
    if (authResult.success) {
        switchBranch(targetBranchId);
        toast({ title: t('successTitle'), description: t('branchSwitchSuccess') });
        setIsSwitchBranchModalOpen(false);
        setSwitchPassword('');
        setTargetBranchId(null);
    } else {
        toast({ title: t('errorTitle'), description: t('incorrectPasswordError'), variant: 'destructive'});
    }
  };


  // Appearance state
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  const { selectedCurrency, changeCurrency } = useCurrency();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dm = localStorage.getItem('darkMode') === 'true';
      setIsDarkMode(dm);
      if (dm) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    if (newIsDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
    }
  };

  const handleLanguageChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    window.location.pathname = newPathname;
  };
  
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.id]: e.target.value });
  };
  
  const handleSaveChangesPassword = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentUser) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ title: t('errorTitle'), description: t('fillAllPasswordFieldsError'), variant: 'destructive'});
        return;
    }
    if (newPassword.length < 6) {
        toast({ title: t('errorTitle'), description: t('passwordTooShortError'), variant: 'destructive'});
        return;
    }
    if (newPassword !== confirmPassword) {
        toast({ title: t('errorTitle'), description: t('passwordsDoNotMatchError'), variant: 'destructive'});
        return;
    }
    
    const result = changePassword(currentUser.id, currentPassword, newPassword);

    if (result.success) {
        toast({ title: t('successTitle'), description: t('passwordChangedSuccess') });
        setIsChangePasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: ''});
    } else {
        toast({ title: t((result.message as any), {defaultValue: result.message}), variant: 'destructive' });
    }
  };


  // Account security placeholders
  const handleNotImplemented = () => {
    toast({ title: t('accountSecurityTitle'), description: 'This feature is not yet available in this demo.', variant: 'default' });
  }

  const devName = currentLocale === 'ar' ? 'محمد شمخي' : 'Mohammed Shamkhi';

  if (!currentUser) {
    return null; // Render nothing or a loading/unauthorized state
  }
  
  const isAdmin = currentUser.role === 'Admin';


  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
      {isAdmin && (
        <>
            <Dialog open={isSwitchBranchModalOpen} onOpenChange={setIsSwitchBranchModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('confirmSwitchBranchTitle')}</DialogTitle>
                        <DialogDescription>{t('confirmSwitchBranchDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="switch_password">{t('currentPasswordLabel')}</Label>
                        <Input 
                            id="switch_password" 
                            type="password"
                            value={switchPassword}
                            onChange={(e) => setSwitchPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSwitchBranch(); }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSwitchBranchModalOpen(false)}>{tg('cancel')}</Button>
                        <Button onClick={handleConfirmSwitchBranch}>{t('confirmSwitchButton')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageBranchesModalOpen} onOpenChange={setIsManageBranchesModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('manageBranchesModalTitle')}</DialogTitle>
                        <DialogDescription>{t('manageBranchesModalDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-branch-name">{t('addNewBranchButton')}</Label>
                            <div className="flex gap-2">
                            <Input 
                                id="new-branch-name" 
                                value={newBranchName} 
                                onChange={(e) => setNewBranchName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewBranch(); }}
                                placeholder="e.g., Baghdad Central Branch"
                            />
                            <Button onClick={handleAddNewBranch}>{t('addBranchButton')}</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('existingBranchesLabel')}</Label>
                            <div className="flex flex-col gap-2 rounded-md border p-3 bg-muted/50 max-h-60 overflow-y-auto">
                                {branches.map(branch => (
                                    <div key={branch.id} className="flex items-center justify-between gap-2 p-1 rounded-md hover:bg-background/50 group">
                                        <span className="text-sm font-medium">{branch.name}</span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title={t('deleteBranchButton')}
                                            onClick={() => setBranchToDelete(branch)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageBranchesModalOpen(false)}>{tg('close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={!!branchToDelete} onOpenChange={(isOpen) => !isOpen && setBranchToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteBranchConfirmTitle', { branchName: branchToDelete?.name })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {branchToDelete?.id === 'main' ? t('deleteMainBranchConfirmDescription') : t('deleteBranchConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="delete_password">{t('confirmPasswordToDelete')}</Label>
                        <Input 
                            id="delete_password" 
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmDeleteBranch(); }}
                            placeholder={t('currentPasswordLabel')}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setBranchToDelete(null); setDeletePassword(''); }}>{tg('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteBranch} className={buttonVariants({ variant: "destructive" })}>
                            {tg('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}

      <div className="flex flex-col gap-6">
        {isAdmin && (
            <Card className="order-1">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> {t('branchManagementTitle')}</CardTitle>
                    <CardDescription>{t('branchManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="active-branch">{t('activeBranchLabel')}</Label>
                        <Select value={activeBranch?.id || ''} onValueChange={handleSelectBranchToSwitch}>
                            <SelectTrigger id="active-branch">
                                <SelectValue placeholder={t('selectBranchPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                     <Button variant="outline" className="w-full" onClick={() => setIsManageBranchesModalOpen(true)}>
                        <SlidersHorizontal className="h-4 w-4" /> {t('manageBranchesButton')}
                    </Button>
                    
                    <Separator/>

                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">{t('editBranchInfoTitle')}</h4>
                      <p className="text-sm text-muted-foreground">{t('editBranchInfoDescription')}</p>
                    </div>

                    <div>
                        <Label htmlFor="name">{t('branchNameLabel')}</Label>
                        <Input id="name" value={localBranchInfo?.name || ''} onChange={handleBranchInfoChange} />
                    </div>
                    <div>
                        <Label htmlFor="contact">{t('branchContactLabel')}</Label>
                        <Input id="contact" type="tel" value={localBranchInfo?.contact || ''} onChange={handleBranchInfoChange} />
                    </div>
                    <Button onClick={handleSaveBranchInfo} disabled={!activeBranch}>{t('saveBranchInfoButton')}</Button>
                </CardContent>
            </Card>
           )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 order-2">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> {t('accountSecurityTitle')}</CardTitle>
                        <CardDescription>{t('accountSecurityDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">{t('changePasswordButton')}</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('changePasswordModalTitle')}</DialogTitle>
                                    <DialogDescription>{t('changePasswordModalDescription')}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div>
                                        <Label htmlFor="currentPassword">{t('currentPasswordLabel')}</Label>
                                        <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordInputChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
                                        <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordInputChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmPassword">{t('confirmNewPasswordLabel')}</Label>
                                        <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsChangePasswordModalOpen(false)}>{tg('cancel')}</Button>
                                    <Button onClick={handleSaveChangesPassword}>{t('savePasswordButton')}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        {isAdmin && (
                            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                                <Label htmlFor="2fa-switch" className="flex flex-col space-y-1">
                                <span>{t('twoFactorAuthLabel')}</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                    {t('twoFactorAuthDescription')}
                                </span>
                                </Label>
                                <Switch id="2fa-switch" onCheckedChange={handleNotImplemented} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> {t('appearanceTitle')}</CardTitle>
                        <CardDescription>{t('appearanceDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                            <Label htmlFor="darkMode-switch" className="flex flex-col space-y-1">
                            <span>{t('darkModeLabel')}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {t('darkModeDescription')}
                            </span>
                            </Label>
                            <Switch id="darkMode-switch" checked={isDarkMode} onCheckedChange={toggleDarkMode}/>
                        </div>
                        <div>
                            <Label htmlFor="language">{t('languageLabel')}</Label>
                            <Select value={currentLocale} onValueChange={handleLanguageChange}>
                                <SelectTrigger id="language" className="w-full">
                                    <SelectValue placeholder={t('selectLanguagePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">{t('english')}</SelectItem>
                                    <SelectItem value="ar">{t('arabic')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {t('notificationsTitle')}</CardTitle>
                        <CardDescription>{t('notificationsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                            <Label htmlFor="lowStockAlerts" className="flex flex-col space-y-1">
                            <span>{t('lowStockAlertsLabel')}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {t('lowStockAlertsDescription')}
                            </span>
                            </Label>
                            <Switch id="lowStockAlerts" checked={localNotifications?.lowStockAlerts} onCheckedChange={(checked) => handleNotificationSwitchChange('lowStockAlerts', !!checked)}/>
                        </div>
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                            <Label htmlFor="debtReminders" className="flex flex-col space-y-1">
                            <span>{t('debtRemindersLabel')}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {t('debtRemindersDescription')}
                            </span>
                            </Label>
                            <Switch id="debtReminders" checked={localNotifications?.debtReminders} onCheckedChange={(checked) => handleNotificationSwitchChange('debtReminders', !!checked)} />
                        </div>
                        <Button asChild className="w-full justify-start gap-2 bg-[#29A9EA] hover:bg-[#29A9EA]/90 text-white">
                            <a href="https://t.me/infby2" target="_blank" rel="noopener noreferrer">
                                <Send className="h-4 w-4" />
                                {t('getUpdatesOnTelegram')}
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" /> {t('currencySettingsTitle')}
                    </CardTitle>
                    <CardDescription>{t('currencySettingsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div>
                    <Label htmlFor="currency">{t('displayCurrencyLabel')}</Label>
                    <Select value={selectedCurrency.code} onValueChange={changeCurrency}>
                        <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder={t('selectCurrencyPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                        {availableCurrencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                            {currency.name} ({currency.symbol})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </CardContent>
                </Card>
                
                {isAdmin && localInvoiceSettings && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {t('invoiceSettingsTitle')}</CardTitle>
                            <CardDescription>{t('invoiceSettingsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <Tabs defaultValue="content">
                            <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="content">{t('tabContent')}</TabsTrigger>
                            <TabsTrigger value="style">{t('tabStyle')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="content" className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="invoice-template">{t('invoiceTemplateLabel')}</Label>
                                    <Select 
                                        value={localInvoiceSettings.template}
                                        onValueChange={(value: 'standard' | 'compact') => handleInvoiceSettingsChange('template', value)}
                                    >
                                        <SelectTrigger id="invoice-template"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">{t('standardTemplate')}</SelectItem>
                                            <SelectItem value="compact">{t('compactTemplate')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('logoUrlLabel')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-10 w-10 rounded-md border">
                                            <AvatarImage src={localInvoiceSettings.logoUrl || undefined} className="object-contain" />
                                            <AvatarFallback className="rounded-md"><ImageIcon /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <Button asChild variant="outline" className="w-full">
                                                <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                                                    <Upload className="h-4 w-4" />
                                                    {t('chooseLogoButton')}
                                                </label>
                                            </Button>
                                            <Input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoFileChange} />
                                        </div>
                                        {localInvoiceSettings.logoUrl && (
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleInvoiceSettingsChange('logoUrl', '')} title={t('removeLogoButton')}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="logo-size" className="sr-only">Logo Size</Label>
                                        <Select 
                                            value={localInvoiceSettings.logoSize}
                                            onValueChange={(value: 'small' | 'medium' | 'large') => handleInvoiceSettingsChange('logoSize', value)}
                                        >
                                            <SelectTrigger id="logo-size" className="mt-2">
                                            <SelectValue placeholder={t('logoSizePlaceholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="small">{t('logoSizeSmall')}</SelectItem>
                                                <SelectItem value="medium">{t('logoSizeMedium')}</SelectItem>
                                                <SelectItem value="large">{t('logoSizeLarge')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-md border p-4 space-y-3">
                                <h4 className="text-sm font-medium">{t('invoiceDisplayOptions')}</h4>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Checkbox id="showCustomerPhone" checked={localInvoiceSettings.showCustomerPhone} onCheckedChange={(checked) => handleInvoiceSettingsChange('showCustomerPhone', !!checked)} />
                                    <Label htmlFor="showCustomerPhone" className="font-normal">{t('showCustomerPhoneLabel')}</Label>
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Checkbox id="showBranchContact" checked={localInvoiceSettings.showBranchContact} onCheckedChange={(checked) => handleInvoiceSettingsChange('showBranchContact', !!checked)} />
                                    <Label htmlFor="showBranchContact" className="font-normal">{t('showBranchContactLabel')}</Label>
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Checkbox id="showDiscount" checked={localInvoiceSettings.showDiscount} onCheckedChange={(checked) => handleInvoiceSettingsChange('showDiscount', !!checked)} />
                                    <Label htmlFor="showDiscount" className="font-normal">{t('showDiscountLabel')}</Label>
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Checkbox id="showRemainingDebt" checked={localInvoiceSettings.showRemainingDebt} onCheckedChange={(checked) => handleInvoiceSettingsChange('showRemainingDebt', !!checked)} />
                                    <Label htmlFor="showRemainingDebt" className="font-normal">{t('showRemainingDebtLabel')}</Label>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="footerText">{t('customFooterLabel')}</Label>
                                <Textarea 
                                    id="footerText"
                                    value={localInvoiceSettings.footerText}
                                    onChange={(e) => handleInvoiceSettingsChange('footerText', e.target.value)}
                                    placeholder={t('customFooterPlaceholder')}
                                    rows={3}
                                />
                            </div>
                            </TabsContent>
                            <TabsContent value="style" className="pt-4 space-y-4">
                            <div>
                                    <Label htmlFor="fontFamily">{t('fontFamilyLabel')}</Label>
                                    <Select value={localInvoiceSettings.fontFamily} onValueChange={(value) => handleInvoiceSettingsChange('fontFamily', value)}>
                                        <SelectTrigger id="fontFamily"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="font-body">Default App Font</SelectItem>
                                            <SelectItem value="font-cairo">Cairo (Modern)</SelectItem>
                                            <SelectItem value="font-tajawal">Tajawal (Elegant)</SelectItem>
                                            <SelectItem value="font-amiri">Amiri (Classic)</SelectItem>
                                            <SelectItem value="font-inter">Inter (Sans-serif)</SelectItem>
                                            <SelectItem value="font-mono">Monospace (Receipt)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="footerFontSize">{t('footerFontSizeLabel')}</Label>
                                        <Input
                                            id="footerFontSize"
                                            value={localInvoiceSettings.footerFontSize}
                                            onChange={(e) => handleInvoiceSettingsChange('footerFontSize', e.target.value)}
                                            placeholder="e.g. 10px"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="footerAlign">{t('footerAlignLabel')}</Label>
                                        <Select value={localInvoiceSettings.footerAlign} onValueChange={(value) => handleInvoiceSettingsChange('footerAlign', value)}>
                                            <SelectTrigger id="footerAlign"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="left">{t('alignLeft')}</SelectItem>
                                                <SelectItem value="center">{t('alignCenter')}</SelectItem>
                                                <SelectItem value="right">{t('alignRight')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Separator/>
                                <ColorPicker label={t('primaryColorLabel')} value={localInvoiceSettings.primaryColor} onChange={(v) => handleInvoiceSettingsChange('primaryColor', v)} />
                                <ColorPicker label={t('borderColorLabel')} value={localInvoiceSettings.borderColor} onChange={(v) => handleInvoiceSettingsChange('borderColor', v)} />
                                <Separator />
                                <ColorPicker label={t('headerBackgroundColorLabel')} value={localInvoiceSettings.headerBackgroundColor} onChange={(v) => handleInvoiceSettingsChange('headerBackgroundColor', v)} />
                                <ColorPicker label={t('headerTextColorLabel')} value={localInvoiceSettings.headerTextColor} onChange={(v) => handleInvoiceSettingsChange('headerTextColor', v)} />
                                <Separator />
                                <ColorPicker label={t('tableHeaderBackgroundColorLabel')} value={localInvoiceSettings.tableHeaderBackgroundColor} onChange={(v) => handleInvoiceSettingsChange('tableHeaderBackgroundColor', v)} />
                                <ColorPicker label={t('tableHeaderTextColorLabel')} value={localInvoiceSettings.tableHeaderTextColor} onChange={(v) => handleInvoiceSettingsChange('tableHeaderTextColor', v)} />
                                <ColorPicker label={t('tableTextColorLabel')} value={localInvoiceSettings.tableTextColor} onChange={(v) => handleInvoiceSettingsChange('tableTextColor', v)} />
                            </TabsContent>
                        </Tabs>
                        <Button onClick={handleSaveInvoiceSettings} className="w-full">{t('saveInvoiceSettingsButton')}</Button>
                        </CardContent>
                    </Card>
                )}

                {isAdmin && <DataManagementCard onSuccess={() => window.location.reload()} />}
                
                {!isAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> {t('adminSettingsTitle')}</CardTitle>
                            <CardDescription>{t('adminSettingsDescription')}</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
      </div>
      <div className="text-center text-sm text-muted-foreground mt-8">
          <p>{tSidebar('developedBy', { name: devName })}</p>
          <p>{tSidebar('version', { number: '1.8' })}</p>
      </div>
    </>
  );
}



