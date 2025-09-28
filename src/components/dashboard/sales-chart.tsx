
'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart as RechartsBarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { useCurrency } from '@/contexts/currency-context';
import type { Product } from '@/contexts/product-context';
import type { Sale } from '@/contexts/sale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface SalesChartProps {
    sales: Sale[];
    products: Product[];
}

export default function SalesChart({ sales, products }: SalesChartProps) {
    const t = useTranslations('DashboardPage');
    const locale = useLocale();
    const { convertToSelectedCurrency, selectedCurrency } = useCurrency();

    const chartData = React.useMemo(() => {
        // Use a "YYYY-MM" format for keys to ensure uniqueness across years.
        const dataByMonth: Record<string, { sales: number; profit: number }> = {};

        // Generate the last 6 months' labels and keys first
        const last6Months: { key: string; month: string }[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            
            last6Months.push({
                key: key,
                month: monthDate.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }),
            });
            // Initialize data for this month to ensure it exists
            dataByMonth[key] = { sales: 0, profit: 0 };
        }
        
        // Populate the data from sales
        sales.forEach(sale => {
            try {
                const saleDate = new Date(sale.date);
                const year = saleDate.getFullYear();
                const month = saleDate.getMonth() + 1; // getMonth() is 0-indexed
                const key = `${year}-${String(month).padStart(2, '0')}`;

                // Only process sales that fall within our 6-month window
                if (dataByMonth[key]) {
                    const subtotal = sale.items.reduce((sum, item) => sum + (item.priceUSD * item.quantity), 0);
                    const costOfGoods = sale.items.reduce((cogs, item) => cogs + (item.purchasePriceUSD || 0) * item.quantity, 0);
                    const discount = sale.discountAmountUSD || 0;
                    
                    const saleProfit = subtotal - costOfGoods - discount;
                    
                    dataByMonth[key].sales += sale.totalUSD;
                    dataByMonth[key].profit += saleProfit;
                }

            } catch (e) {
                // Ignore invalid dates in data
            }
        });

        // Map the generated months to chart data format
        return last6Months.map(monthInfo => ({
            month: monthInfo.month,
            sales: convertToSelectedCurrency(dataByMonth[monthInfo.key]?.sales || 0),
            profit: convertToSelectedCurrency(dataByMonth[monthInfo.key]?.profit || 0),
        }));
    }, [sales, convertToSelectedCurrency, locale]);

    const chartConfig = React.useMemo(() => ({
        sales: {
          label: t('salesLabel', { currencySymbol: selectedCurrency.symbol }),
          color: "hsl(var(--chart-1))",
        },
        profit: {
          label: t('profitLabel', { currencySymbol: selectedCurrency.symbol }),
          color: "hsl(var(--chart-2))",
        }
    }) satisfies ChartConfig, [t, selectedCurrency.symbol]);

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> {t('salesTrendTitle')}
                </CardTitle>
                <CardDescription>{t('salesTrendDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="ps-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsBarChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
                    reversed={locale === 'ar'}
                    />
                    <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    tickFormatter={(value) => Number(value).toLocaleString()}
                    orientation={locale === 'ar' ? 'right' : 'left'}
                    />
                    <ChartTooltip 
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />} 
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                    <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
