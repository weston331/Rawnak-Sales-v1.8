
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Printer, Search, FileText, Loader2, Package, Archive, AlertTriangle, Users } from 'lucide-react';
import { useSaleData, type Sale } from '@/contexts/sale-context';
import { useProductData, type Product } from '@/contexts/product-context';
import { useCurrency } from '@/contexts/currency-context';
import { useSettings, type Branch, type InvoiceSettings } from '@/contexts/settings-context';
import { useUser } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';
import PrintPreviewDialog from '@/components/sales/print-preview-dialog';


interface MonthlyReport {
    totalSales: number;
    totalCost: number;
    totalProfit: number;
    totalTransactions: number;
    bestSellingItem: { name: string; quantity: number } | null;
    outOfStockProducts: Product[];
    deadStockProducts: Product[];
    bestCustomers: { name: string; total: number }[];
}

const ReportDisplay = React.forwardRef<HTMLDivElement, { 
    report: MonthlyReport | null; 
    selectedMonth: Date;
    currencyFormatter: (amount: number) => string;
    t: any;
    tg: any;
    branchName: string;
}>(({ report, selectedMonth, currencyFormatter, t, tg, branchName }, ref) => {
    if (!report) return null;

    return (
        <div ref={ref} className="p-4 bg-background print:bg-white print:text-black">
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold font-headline">{t('monthlyReportTitle')}</h2>
                <p className="text-muted-foreground">{branchName}</p>
                <p className="font-semibold">{format(selectedMonth, 'MMMM yyyy')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                 <Card>
                    <CardHeader><CardTitle className="flex justify-center items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4"/> {t('totalSales')}</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{currencyFormatter(report.totalSales)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex justify-center items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4"/> {t('totalProfit')}</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{currencyFormatter(report.totalProfit)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex justify-center items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4"/> {t('transactions')}</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{report.totalTransactions}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex justify-center items-center gap-2 text-sm font-medium"><Package className="h-4 w-4"/> {t('bestSeller')}</CardTitle></CardHeader>
                    <CardContent><p className="text-lg font-bold">{report.bestSellingItem?.name || t('noData')}</p></CardContent>
                </Card>
            </div>
             <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4 text-primary"/>
                            {t('bestCustomers')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {report.bestCustomers.length > 0 ? (
                             <ul className="text-xs space-y-1">
                                {report.bestCustomers.map(c => <li key={c.name} className="flex justify-between"><span>{c.name}</span> <span className="font-mono">{currencyFormatter(c.total)}</span></li>)}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-xs">{t('noSalesThisMonth')}</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                           <Archive className="h-4 w-4 text-yellow-600"/>
                            {t('deadStockProducts')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {report.deadStockProducts.length > 0 ? (
                             <ul className="text-xs list-disc ps-4">
                                {report.deadStockProducts.slice(0, 5).map(p => <li key={p.id}>{p.name}</li>)}
                                {report.deadStockProducts.length > 5 && <li>{t('andMore', {count: report.deadStockProducts.length - 5})}</li>}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-xs">{t('noDeadStock')}</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 text-destructive"/>
                            {t('outOfStockProducts')}
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        {report.outOfStockProducts.length > 0 ? (
                             <ul className="text-xs list-disc ps-4">
                                {report.outOfStockProducts.slice(0, 5).map(p => <li key={p.id}>{p.name}</li>)}
                                {report.outOfStockProducts.length > 5 && <li>{t('andMore', {count: report.outOfStockProducts.length - 5})}</li>}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-xs">{t('noOutOfStockProducts')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
             <div className="text-center text-xs mt-6 pt-4 border-t print:border-black">
                <p>{t('reportGeneratedOn', { date: new Date().toLocaleString() })}</p>
            </div>
        </div>
    )
});
ReportDisplay.displayName = 'ReportDisplay';


export default function ReportsPage() {
    const t = useTranslations('ReportsPage');
    const t_sales = useTranslations('SalesPage');
    const tg = useTranslations('General');
    const locale = useLocale();
    const router = useRouter();
    const { currentUser } = useUser();
    const { toast } = useToast();
    
    useEffect(() => {
      if (currentUser && currentUser.role !== 'Admin') {
        router.replace(`/${locale}/dashboard`);
      }
    }, [currentUser, locale, router]);

    const { sales } = useSaleData();
    const { products } = useProductData();
    const { formatCurrency } = useCurrency();
    const { activeBranch, invoiceSettings } = useSettings();

    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
    
    const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

    const reportComponentRef = useRef<HTMLDivElement>(null);
    const handlePrintReport = () => {
        window.print();
    };
    
    const findInvoice = () => {
        if (!invoiceNumber.trim()) return;
        setIsSearchingInvoice(true);
        setMonthlyReport(null);
        const searchTerm = invoiceNumber.trim();
        const foundSale = sales.find(s => s.invoiceNumber === searchTerm || s.id.substring(0, 8) === searchTerm || s.id === searchTerm);
        
        setTimeout(() => {
            if (foundSale) {
                toast({
                    title: t('invoiceFoundTitle'),
                    description: t('invoiceFoundDescription'),
                });
                setSaleToPrint(foundSale);
            } else {
                toast({
                    title: t('invoiceNotFound'),
                    variant: 'destructive'
                });
                setSaleToPrint(null);
            }
            setIsSearchingInvoice(false);
        }, 500);
    };

    const generateReport = () => {
        setIsGenerating(true);
        setSaleToPrint(null);
        
        const startDate = startOfMonth(selectedMonth);
        const endDate = endOfMonth(selectedMonth);

        const filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });
        
        const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalUSD, 0);
        
        const { totalCost, totalProfit } = filteredSales.reduce((acc, sale) => {
            const subtotal = sale.items.reduce((sum, item) => sum + (item.priceUSD * item.quantity), 0);
            const cost = sale.items.reduce((sum, item) => sum + (item.purchasePriceUSD || 0) * item.quantity, 0);
            const discount = sale.discountAmountUSD || 0;
            
            acc.totalCost += cost;
            acc.totalProfit += (subtotal - cost - discount);
            return acc;
        }, { totalCost: 0, totalProfit: 0 });

        const allItemsSold = filteredSales.flatMap(sale => sale.items);
        const itemQuantities = allItemsSold.reduce((acc, item) => {
            acc[item.name] = (acc[item.name] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        const bestSellingItem = Object.keys(itemQuantities).length > 0 
            ? Object.entries(itemQuantities).reduce((a, b) => b[1] > a[1] ? b : a)
            : null;
        
        // Customer analytics
        const customerSales = filteredSales.reduce((acc, sale) => {
            acc[sale.customerName] = (acc[sale.customerName] || 0) + sale.totalUSD;
            return acc;
        }, {} as Record<string, number>);
        
        const bestCustomers = Object.entries(customerSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));

        // Dead stock and Out of stock calculation
        const outOfStockProducts = products.filter(p => p.stock === 0);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const soldProductIds = new Set(sales.filter(s => new Date(s.date) > ninetyDaysAgo).flatMap(s => s.items.map(i => i.productId)));
        const deadStockProducts = products.filter(p => !soldProductIds.has(p.id) && new Date(p.createdAt) < ninetyDaysAgo);
        
        setTimeout(() => {
            setMonthlyReport({
                totalSales,
                totalCost,
                totalProfit,
                totalTransactions: filteredSales.length,
                bestSellingItem: bestSellingItem ? { name: bestSellingItem[0], quantity: bestSellingItem[1] } : null,
                outOfStockProducts,
                deadStockProducts,
                bestCustomers
            });
            setIsGenerating(false);
        }, 500);
    };
    
    if (!currentUser || currentUser.role !== 'Admin') {
        return (
             <div className="flex h-full items-center justify-center">
                <p>Redirecting...</p>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title={t('title')}
                description={t('description')}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 non-printable">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> {t('monthlyReportTitle')}
                        </CardTitle>
                        <CardDescription>{t('monthlyReportDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>{t('selectMonthLabel')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(selectedMonth, 'MMMM yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedMonth}
                                        onSelect={(date) => date && setSelectedMonth(date)}
                                        initialFocus
                                        captionLayout="dropdown-buttons"
                                        fromYear={2020}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                            <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
                            {t('generateReportButton')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                            <Printer className="h-5 w-5 text-primary" /> {t('reprintInvoiceTitle')}
                        </CardTitle>
                        <CardDescription>{t('reprintInvoiceDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="invoice-number">{t('invoiceNumberLabel')}</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="invoice-number" 
                                    placeholder={t('invoiceNumberPlaceholder')}
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                                />
                                <Button onClick={findInvoice} type="button" disabled={isSearchingInvoice}>
                                    {isSearchingInvoice ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            
            {monthlyReport && (
                <div className="printable-area">
                    <Card className="mt-8 border-none shadow-none print:border-none print:shadow-none">
                        <CardHeader className="non-printable">
                            <div className="flex justify-between items-center">
                                <CardTitle>{t('monthlyReportTitle')} - {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
                                <Button variant="outline" onClick={handlePrintReport}>
                                    <Printer className="h-4 w-4" /> {t('printReportButton')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ReportDisplay 
                                ref={reportComponentRef}
                                report={monthlyReport} 
                                selectedMonth={selectedMonth} 
                                currencyFormatter={formatCurrency} 
                                t={t} 
                                tg={tg}
                                branchName={activeBranch?.name || ''} 
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            
            {saleToPrint && (
                <PrintPreviewDialog
                  isOpen={!!saleToPrint}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) setSaleToPrint(null);
                  }}
                  sale={saleToPrint}
                  branch={activeBranch}
                  invoiceSettings={invoiceSettings}
                  currencyFormatter={formatCurrency}
                  locale={locale}
                  t={t_sales}
                  tg={tg}
                />
            )}
        </>
    );
}
