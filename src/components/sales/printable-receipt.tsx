
'use client';

import React, { forwardRef } from 'react';
import type { Sale } from '@/contexts/sale-context';
import type { InvoiceSettings, Branch } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

interface PrintableReceiptProps {
  sale: Sale; 
  currencyFormatter: (amount: number) => string; 
  t: any; 
  tg: any; 
  branch: Branch | null;
  invoiceSettings: InvoiceSettings;
  locale: string;
}

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
    ({ sale, currencyFormatter, t, tg, branch, invoiceSettings, locale }, ref) => {
    
    if (!sale) {
        return null;
    }
    const items = sale.items || [];
    
    const inlineStyles = {
        '--header-bg-color': invoiceSettings.headerBackgroundColor,
        '--header-text-color': invoiceSettings.headerTextColor,
        '--table-header-bg-color': invoiceSettings.tableHeaderBackgroundColor,
        '--table-header-text-color': invoiceSettings.tableHeaderTextColor,
        '--table-text-color': invoiceSettings.tableTextColor,
        '--border-color': invoiceSettings.borderColor,
        '--primary-color': invoiceSettings.primaryColor,
    } as React.CSSProperties;

    const fontClass = invoiceSettings.fontFamily || 'font-body';
    
    const logoSizeClass = {
        small: 'h-12',
        medium: 'h-16',
        large: 'h-20'
    }[invoiceSettings.logoSize || 'medium'];

    const headerContent = (
      <div style={{ backgroundColor: 'var(--header-bg-color)', color: 'var(--header-text-color)' }} className={cn("text-center p-2", invoiceSettings.template === 'compact' ? 'mb-2' : 'mb-6')}>
          {invoiceSettings.logoUrl && (
             <img src={invoiceSettings.logoUrl} alt="Logo" className={cn("w-auto mx-auto mb-2 object-contain", logoSizeClass)} />
          )}
          <h1 style={{ color: 'var(--primary-color)' }} className={cn("font-bold", invoiceSettings.template === 'compact' ? 'text-sm' : 'text-2xl')}>{branch?.name}</h1>
          {invoiceSettings.showBranchContact && branch?.contact && <p className="text-xs">{branch.contact}</p>}
          <p className={cn(invoiceSettings.template === 'compact' ? 'text-xs' : 'text-sm', 'font-bold')}>{t('receiptTitle')}</p>
      </div>
    );

    if (invoiceSettings.template === 'compact') {
        return (
            <div ref={ref} className={cn("bg-white text-black p-2 text-xs w-[72mm] mx-auto print:!text-black font-medium", fontClass)} style={inlineStyles}>
                {headerContent}
                <hr className="border-dashed border-black my-1"/>
                <div className="text-start text-[10px]">
                    <p><span className="font-semibold">{t('receiptBilledTo')}:</span> {sale.customerName}</p>
                    {invoiceSettings.showCustomerPhone && sale.customerPhone && <p><span className="font-semibold">{t('receiptCustomerPhone')}:</span> <span dir="ltr" className="inline-block">{sale.customerPhone}</span></p>}
                    {sale.customerLocation && <p><span className="font-semibold">{t('receiptCustomerLocation')}:</span> {sale.customerLocation}</p>}
                    <p><span className="font-semibold">{t('receiptInvoiceNo')}:</span> {sale.invoiceNumber || sale.id}</p>
                    <p><span className="font-semibold">{t('receiptDate')}:</span> {new Date(sale.date).toLocaleString(locale)}</p>
                </div>
                <hr className="border-dashed border-black my-1"/>
                <div className="flex font-bold" style={{ color: invoiceSettings.primaryColor }}>
                    <div className="flex-grow">{t('tableHeaderProduct')}</div>
                    <div className="w-12 text-center">{t('tableHeaderQuantity')}</div>
                    <div className="w-16 text-end">{t('receiptTotal')}</div>
                </div>
                <hr className="border-dashed border-black my-1"/>
                {items.length > 0 ? items.map((item) => (
                    <div key={item.productId} className="mb-1">
                        <div>{item.name}</div>
                        <div className="flex justify-between">
                            <span className="ps-2">{item.quantity} x {currencyFormatter(item.priceUSD)}</span>
                            <span>{currencyFormatter(item.priceUSD * item.quantity)}</span>
                        </div>
                    </div>
                )) : (
                    <p className="text-center py-2">{t('noItemsInCart')}</p>
                )}
                <hr className="border-dashed border-black my-1"/>
                 <div className="mt-2 space-y-1">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td>{t('subtotalLabel', { amount: '' }).split(':')[0]}:</td>
                                <td className="text-end font-mono">{currencyFormatter(sale.totalUSD + (sale.discountAmountUSD || 0))}</td>
                            </tr>
                            {invoiceSettings.showDiscount && (sale.discountAmountUSD || 0) > 0 && (
                                <tr>
                                    <td>
                                        {t('discountAmountLabel', { amount: '' }).split(':')[0]}
                                        {sale.discountType === 'percentage' && ` (${sale.discountValue || 0}%)`}
                                    </td>
                                    <td className="text-end font-mono">-{currencyFormatter(sale.discountAmountUSD || 0)}</td>
                                </tr>
                            )}
                            <tr className="font-bold text-sm border-t pt-1 mt-1 border-black border-dashed" style={{ color: 'var(--primary-color)' }}>
                                <td>{t('totalAmountLabel', { amount: '' }).split(':')[0]}:</td>
                                <td className="text-end font-mono">{currencyFormatter(sale.totalUSD)}</td>
                            </tr>
                            <tr>
                                <td>{t('receiptPaymentMethod')}:</td>
                                <td className="text-end font-semibold">{sale.status === 'Paid' ? t('paidStatus') : (sale.status === 'Partial' ? t('partialPaymentStatus') : t('debtStatus'))}</td>
                            </tr>
                            {invoiceSettings.showRemainingDebt && sale.status !== 'Paid' && (
                                <>
                                <tr>
                                    <td>{t('amountPaidLabel')}:</td>
                                    <td className="text-end font-mono">{currencyFormatter(sale.amountPaidUSD || 0)}</td>
                                </tr>
                                 <tr>
                                    <td>{t('remainingDebtLabelPrint')}:</td>
                                    <td className="text-end font-mono">{currencyFormatter(sale.totalUSD - (sale.amountPaidUSD || 0))}</td>
                                </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="text-center mt-4 pt-2 border-t border-black border-dashed" style={{ fontSize: invoiceSettings.footerFontSize, textAlign: invoiceSettings.footerAlign }}>
                    <div className="whitespace-pre-wrap">
                        {invoiceSettings.footerText}
                    </div>
                </div>
            </div>
        );
    }

    // Standard Template
    return (
      <div ref={ref} className={cn("bg-white text-black p-4 print:!text-black font-medium", fontClass)} style={inlineStyles}>
        <div className="w-full max-w-md mx-auto">
            {headerContent}
            <div className="flex justify-between text-sm mb-4 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                    <p><span className="font-bold">{t('receiptBilledTo')}:</span> {sale.customerName}</p>
                    {invoiceSettings.showCustomerPhone && sale.customerPhone && <p className="text-xs">{t('receiptCustomerPhone')}: <span dir="ltr" className="inline-block">{sale.customerPhone}</span></p>}
                    {sale.customerLocation && <p className="text-xs">{t('receiptCustomerLocation')}: {sale.customerLocation}</p>}
                </div>
                <div className="text-end">
                    <p><span className="font-bold">{t('receiptInvoiceNo')}:</span> {sale.invoiceNumber || sale.id}</p>
                    <p><span className="font-bold">{t('receiptDate')}:</span> {new Date(sale.date).toLocaleString(locale)}</p>
                </div>
            </div>
            
            <table className="w-full text-sm border-collapse" style={{ color: 'var(--table-text-color)', borderColor: 'var(--border-color)' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--table-header-bg-color)', color: 'var(--table-header-text-color)' }}>
                        <th className="p-2 border text-start font-bold" style={{ borderColor: 'var(--border-color)' }}>{t('tableHeaderProduct')}</th>
                        <th className="p-2 border text-center font-bold w-16" style={{ borderColor: 'var(--border-color)' }}>{t('tableHeaderQuantity')}</th>
                        <th className="p-2 border text-end font-bold w-24" style={{ borderColor: 'var(--border-color)' }}>{t('receiptUnitPrice')}</th>
                        <th className="p-2 border text-end font-bold w-24" style={{ borderColor: 'var(--border-color)' }}>{t('receiptTotal')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? items.map((item, index) => (
                        <tr key={item.productId} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="p-2 border-x font-semibold" style={{ borderColor: 'var(--border-color)' }}>{item.name}</td>
                            <td className="p-2 border-x text-center font-mono" style={{ borderColor: 'var(--border-color)' }}>{item.quantity}</td>
                            <td className="p-2 border-x text-end font-mono" style={{ borderColor: 'var(--border-color)' }}>{currencyFormatter(item.priceUSD)}</td>
                            <td className="p-2 border-x text-end font-mono font-semibold" style={{ borderColor: 'var(--border-color)' }}>{currencyFormatter(item.priceUSD * item.quantity)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500">{t('noItemsInCart')}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="mt-4 flex justify-end">
                <table className="w-full max-w-sm text-sm" style={{ color: 'var(--table-text-color)' }}>
                    <tbody>
                        <tr>
                            <td className="py-1 px-2 font-medium">{t('subtotalLabel', { amount: '' }).split(':')[0]}:</td>
                            <td className="py-1 px-2 text-end font-mono">{currencyFormatter(sale.totalUSD + (sale.discountAmountUSD || 0))}</td>
                        </tr>
                        {invoiceSettings.showDiscount && (sale.discountAmountUSD || 0) > 0 && (
                          <tr>
                              <td className="py-1 px-2 font-medium">
                                  {t('discountAmountLabel', { amount: '' }).split(':')[0]}
                                  {sale.discountType === 'percentage' && ` (${sale.discountValue || 0}%)`}
                              </td>
                              <td className="py-1 px-2 text-end font-mono" style={{ color: invoiceSettings.primaryColor === '#000000' ? '#DC2626' : invoiceSettings.primaryColor }}>-{currencyFormatter(sale.discountAmountUSD || 0)}</td>
                          </tr>
                        )}
                        <tr className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="py-2 px-2 font-bold text-base" style={{ color: 'var(--primary-color)' }}>{t('totalAmountLabel', { amount: '' }).split(':')[0]}:</td>
                            <td className="py-2 px-2 text-end font-mono font-bold text-base" style={{ color: 'var(--primary-color)' }}>{currencyFormatter(sale.totalUSD)}</td>
                        </tr>
                         <tr>
                            <td className="py-1 px-2 font-medium">{t('receiptPaymentMethod')}:</td>
                            <td className="py-1 px-2 text-end font-semibold">{sale.status === 'Paid' ? t('paidStatus') : (sale.status === 'Partial' ? t('partialPaymentStatus') : t('debtStatus'))}</td>
                        </tr>
                         {invoiceSettings.showRemainingDebt && sale.status !== 'Paid' && (
                            <>
                                <tr>
                                    <td className="py-1 px-2 font-medium">{t('amountPaidLabel')}:</td>
                                    <td className="py-1 px-2 text-end font-mono">{currencyFormatter(sale.amountPaidUSD || 0)}</td>
                                </tr>
                                 <tr className="font-semibold">
                                    <td className="py-1 px-2">{t('remainingDebtLabelPrint')}:</td>
                                    <td className="py-1 px-2 text-end font-mono">{currencyFormatter(sale.totalUSD - (sale.amountPaidUSD || 0))}</td>
                                </tr>
                            </>
                         )}
                    </tbody>
                </table>
            </div>
            
            <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)', fontSize: invoiceSettings.footerFontSize, textAlign: invoiceSettings.footerAlign }}>
                <div className="whitespace-pre-wrap">{invoiceSettings.footerText}</div>
            </div>
        </div>
      </div>
    );
});
PrintableReceipt.displayName = 'PrintableReceipt';

export { PrintableReceipt };

  

    