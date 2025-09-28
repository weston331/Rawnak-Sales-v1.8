
'use client';

import React, { useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import {PrintableReceipt} from '@/components/sales/printable-receipt';
import type { Sale } from '@/contexts/sale-context';
import type { InvoiceSettings, Branch } from '@/contexts/settings-context';


interface ReceiptPrinterProps {
    sale: Sale;
    branch: Branch | null;
    invoiceSettings: InvoiceSettings;
    currencyFormatter: (amount: number) => string;
    locale: string;
    t: any;
    tg: any;
    onAfterPrint: () => void;
}

export default function ReceiptPrinter(props: ReceiptPrinterProps) {
    const { onAfterPrint } = props;
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: onAfterPrint,
    });
    
    useEffect(() => {
        // Automatically trigger print when the component mounts
        handlePrint();
    }, [handlePrint]);

    return (
        <div className="hidden">
            <PrintableReceipt ref={componentRef} {...props} />
        </div>
    );
}
