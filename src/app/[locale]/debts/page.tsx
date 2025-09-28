
'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserSearch, Eye, MoreHorizontal, Printer, MessageSquareText, Calendar, AlertTriangle, CreditCard, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from '@/contexts/currency-context';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData } from '@/contexts/customer-context'; // Import the central data hook
import { useSettings } from '@/contexts/settings-context';
import { format, parseISO, formatDistanceStrict, isAfter, addDays, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const isOverdue = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = startOfDay(new Date());
    const due = parseISO(dueDate);
    return isAfter(today, due);
};

const isDueSoon = (dueDate: string | undefined, days: number = 7): boolean => {
    if (!dueDate) return false;
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, days);
    const due = parseISO(dueDate);
    return !isAfter(today, due) && isAfter(sevenDaysFromNow, due);
}

const DebtTableRow = React.memo(({ customer, index, locale, formatCurrency, getDueDateBadge, handleOpenReminderModal, t }: {
    customer: Customer;
    index: number;
    locale: string;
    formatCurrency: (amount: number) => string;
    getDueDateBadge: (dueDate: string | undefined) => React.ReactNode;
    handleOpenReminderModal: (customer: Customer) => void;
    t: any;
}) => (
    <TableRow
        className={cn(
            isOverdue(customer.dueDate) && "bg-destructive/10 hover:bg-destructive/20"
        )}
    >
        <TableCell className="font-mono">{index + 1}</TableCell>
        <TableCell className="font-medium">
            <Link href={`/${locale}/debts/${customer.debtId}`} className="hover:underline">
                {customer.name}
            </Link>
        </TableCell>
        <TableCell>
            {getDueDateBadge(customer.dueDate)}
        </TableCell>
        <TableCell className="text-right font-semibold">
            {formatCurrency(customer.totalDebtUSD)}
        </TableCell>
        <TableCell className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/${locale}/debts/${customer.debtId}`}>
                            <Eye className="h-4 w-4" />
                            {t('actionViewHistory')}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => handleOpenReminderModal(customer)}
                        disabled={!customer.phone}
                        className="text-green-600 focus:text-green-700 focus:bg-green-100/80"
                    >
                        <MessageSquareText className="h-4 w-4" /> {t('actionSendReminder')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>
    </TableRow>
));
DebtTableRow.displayName = 'DebtTableRow';


export default function DebtsPage() {
  const t = useTranslations('DebtsPage');
  const tg = useTranslations('General');
  const locale = useLocale();
  const { formatCurrency, selectedCurrency } = useCurrency();
  const { toast } = useToast();
  const { activeBranch } = useSettings();
  
  // Use the central customer data context as the single source of truth
  const { customers: allCustomers, isLoading } = useCustomerData();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [isClient, setIsClient] = React.useState(false);
  
  const [isReminderModalOpen, setIsReminderModalOpen] = React.useState(false);
  const [customerForReminder, setCustomerForReminder] = React.useState<Customer | null>(null);
  const [reminderMessage, setReminderMessage] = React.useState('');
  
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const filteredCustomers = React.useMemo(() => {
    return allCustomers
      // 1. Get only customers with debt
      .filter(customer => customer.totalDebtUSD > 0)
      // 2. Filter by search term
      .filter(customer => {
        const searchTermLower = searchTerm.toLowerCase();
        if (!searchTermLower) return true;
        const nameMatch = customer.name.toLowerCase().includes(searchTermLower);
        const phoneMatch = customer.phone?.toLowerCase().includes(searchTermLower);
        return nameMatch || phoneMatch;
      })
      // 3. Filter by status
      .filter(customer => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'overdue') return isOverdue(customer.dueDate);
        if (filterStatus === 'due_soon') return isDueSoon(customer.dueDate);
        if (filterStatus === 'no_due_date') return !customer.dueDate;
        return true;
      })
      // 4. Sort by overdue, then due date
      .sort((a, b) => {
        const aIsOverdue = isOverdue(a.dueDate);
        const bIsOverdue = isOverdue(b.dueDate);

        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        // Fallback sort by debt amount if dates are not set
        return b.totalDebtUSD - a.totalDebtUSD;
      });
  }, [allCustomers, searchTerm, filterStatus]);

  const totalOutstandingDebtsUSD = React.useMemo(() => {
    return filteredCustomers.reduce((sum, customer) => sum + customer.totalDebtUSD, 0);
  }, [filteredCustomers]);

  const handleOpenReminderModal = React.useCallback((customer: Customer) => {
    if (!customer.phone) {
      toast({ title: t('noPhoneNumber'), variant: "destructive" });
      return;
    }
    setCustomerForReminder(customer);
    const defaultMessage = t('reminderMessage', {
        customerName: customer.name,
        debtAmount: formatCurrency(customer.totalDebtUSD),
        branchName: activeBranch?.name || 'Rawnak Sales'
    });
    setReminderMessage(defaultMessage);
    setIsReminderModalOpen(true);
  }, [t, formatCurrency, activeBranch, toast]);
  
  const handleSendReminder = React.useCallback(() => {
    if (!customerForReminder || !customerForReminder.phone || !reminderMessage) return;

    const encodedMessage = encodeURIComponent(reminderMessage);
    const whatsappUrl = `https://wa.me/${customerForReminder.phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsReminderModalOpen(false);
  }, [customerForReminder, reminderMessage]);

  const getDueDateBadge = React.useCallback((dueDate: string | undefined) => {
      if (!dueDate) return <Badge variant="outline">{t('noDueDateSet')}</Badge>;
      
      const due = parseISO(dueDate);

      if (isOverdue(dueDate)) {
          if (!isClient) {
              return <Badge variant="destructive" className="items-center gap-1"><AlertTriangle className="h-3 w-3"/>{t('dueDateOverdue')}</Badge>;
          }
          const duration = formatDistanceStrict(new Date(), due, { locale: dateFnsLocale });
          const fullMessage = t('overdueBy', { duration });
          return <Badge variant="destructive" className="items-center gap-1"><AlertTriangle className="h-3 w-3"/>{fullMessage}</Badge>;
      }
      return <Badge variant="secondary" className="items-center gap-1"><Calendar className="h-3 w-3"/> {format(due, 'yyyy-MM-dd')}</Badge>;
  }, [t, isClient, dateFnsLocale]);
  
  const TableSkeleton = () => (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tg('no')}</TableHead>
            <TableHead>{t('tableHeaderCustomerName')}</TableHead>
            <TableHead>{t('tableHeaderDueDate')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-5" /></TableCell>
              <TableCell><Skeleton className="h-5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <div className="relative flex-grow">
                <UserSearch className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="search" 
                    placeholder={t('searchCustomersPlaceholder')} 
                    className="w-full sm:max-w-xs ps-10 rtl:pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByStatusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterAll')}</SelectItem>
                <SelectItem value="overdue">{t('filterOverdue')}</SelectItem>
                <SelectItem value="due_soon">{t('filterDueSoon')}</SelectItem>
                <SelectItem value="no_due_date">{t('filterNoDueDate')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
              <Printer className="h-4 w-4" /> {t('generateReportButton')}
            </Button>
          </div>
        }
      />
      
      <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>{t('sendReminderModalTitle', {customerName: customerForReminder?.name})}</DialogTitle>
                  <DialogDescription>{t('sendReminderModalDescription')}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="reminder-message" className="sr-only">{t('messageLabel')}</Label>
                  <Textarea 
                      id="reminder-message"
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      rows={6}
                      className="min-h-[120px]"
                  />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReminderModalOpen(false)}>{tg('cancel')}</Button>
                  <Button onClick={handleSendReminder}>{t('sendOnWhatsApp')}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>


      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalDebtsTitle')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(totalOutstandingDebtsUSD)}</div>
            )}
            <p className="text-xs text-muted-foreground">{t('totalDebtsDescription')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('customersWithDebtTitle')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{filteredCustomers.length}</div>
            )}
            <p className="text-xs text-muted-foreground">{t('customersWithDebtDescription')}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tg('no')}</TableHead>
                <TableHead>{t('tableHeaderCustomerName')}</TableHead>
                <TableHead>{t('tableHeaderDueDate')}</TableHead>
                <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                    <DebtTableRow
                      key={customer.id}
                      customer={customer}
                      index={index}
                      locale={locale}
                      formatCurrency={formatCurrency}
                      getDueDateBadge={getDueDateBadge}
                      handleOpenReminderModal={handleOpenReminderModal}
                      t={t}
                    />
                ))
               ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          {t('noMatchingDebtsFound')}
                      </TableCell>
                  </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

    
