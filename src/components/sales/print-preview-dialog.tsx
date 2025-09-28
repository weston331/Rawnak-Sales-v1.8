
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PrintableReceipt } from '@/components/sales/printable-receipt';
import type { Sale } from '@/contexts/sale-context';
import type { Branch, InvoiceSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

interface PrintPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: Sale;
  branch: Branch | null;
  invoiceSettings: InvoiceSettings;
  currencyFormatter: (amount: number) => string;
  locale: string;
  t: any;
  tg: any;
}

export default function PrintPreviewDialog({
  isOpen,
  onOpenChange,
  sale,
  ...props
}: PrintPreviewDialogProps) {

  const handlePrint = () => {
    window.print();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl non-printable">
        <DialogHeader>
          <DialogTitle>{props.t('printReceiptButton')}</DialogTitle>
          <DialogDescription>
            {props.t('printPreviewDescription', { invoiceNumber: sale.invoiceNumber })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted p-4">
          {/* This is the visible preview inside the dialog */}
          <PrintableReceipt sale={sale} {...props} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {props.tg('close')}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" /> {props.t('confirmPrintButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
      {/* This is the hidden component that will be targeted by the print styles */}
      <div className="printable-area">
        <PrintableReceipt sale={sale} {...props} />
      </div>
    </Dialog>
  );
}
