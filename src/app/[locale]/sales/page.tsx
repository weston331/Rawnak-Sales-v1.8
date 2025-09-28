
'use client'; 

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Percent, DollarSign, Printer, Eye, MoreHorizontal, PackageSearch, User, Loader2, ConciergeBell, ScanBarcode, Phone, MapPin, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/currency-context';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData } from '@/contexts/customer-context';
import type { Product } from '@/contexts/product-context';
import { useProductData, initialDefinedCategories } from '@/contexts/product-context';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { Sale, SaleItem } from '@/contexts/sale-context';
import { useSaleData, useSaleActions } from '@/contexts/sale-context';
import { useSettings, type InvoiceSettings, type Branch } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import CustomItemModal from '@/components/sales/custom-item-modal';
import BarcodeScanner from '@/components/sales/barcode-scanner';
import PrintPreviewDialog from '@/components/sales/print-preview-dialog';


const ProductSelectionModal = dynamic(() => import('@/components/sales/product-selection-modal'), {
  ssr: false,
  loading: () => (
    <Dialog open={true}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{'Add Product to Cart'}</DialogTitle>
          <Skeleton className="h-10 w-full mt-2" />
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow overflow-hidden">
          <div className="md:col-span-1 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}><CardContent className="p-3 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
});

const CustomerSelectionModal = dynamic(() => import('@/components/sales/customer-selection-modal'), {
  ssr: false,
  loading: () => (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl h-[70vh]">
        <DialogHeader>
            <DialogTitle><Skeleton className="h-8 w-1/3" /></DialogTitle>
             <Skeleton className="h-10 w-full mt-2" />
        </DialogHeader>
         <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => <Card key={i} className="p-3"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></Card>)}
        </div>
      </DialogContent>
    </Dialog>
  )
});


export default function SalesPage() {
  const t = useTranslations('SalesPage');
  const tg = useTranslations('General');
  const t_products = useTranslations('ProductsPage');
  const t_customers = useTranslations('CustomersPage');
  const t_customer_details = useTranslations('CustomerDetailsPage');
  const locale = useLocale();
  const { formatCurrency, selectedCurrency, convertToSelectedCurrency, convertFromSelectedCurrencyToUSD } = useCurrency();
  const { products, categories } = useProductData();
  const { toast } = useToast();
  const { recordNewSaleTransaction } = useSaleActions();
  const { sales: allSales } = useSaleData();
  const { activeBranch, invoiceSettings } = useSettings();

  const recentSales = useMemo(() => allSales.slice(0, 5), [allSales]);

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paid' | 'debt' | 'partial'>('paid');
  const [partialAmountPaid, setPartialAmountPaid] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);

  const showPrintToast = (newSale: Sale) => {
    toast({
        title: t('saleRecordedSuccessfully'),
        description: t('stockAndRecordsUpdated'),
        duration: 10000,
        action: (
          <ToastAction
            altText={t('printReceiptButton')}
            onClick={() => setSaleToPrint(newSale)}
          >
            {t('printReceiptButton')}
          </ToastAction>
        ),
    });
  }

  // State for modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const translateCategory = useCallback((categoryName: string) => {
      const category = categories.find(c => c.name === categoryName);
      if (category) {
        const isPredefined = initialDefinedCategories.some(c => c.name.toLowerCase() === category.name.toLowerCase());
        if (isPredefined) {
          const key = `${category.name.toLowerCase().replace(/\s/g, '')}Category`;
          return t_products(key as any, {}, { defaultValue: category.name });
        }
        return category.name;
      }
      return categoryName;
  }, [t_products, categories]);

  const productFinder = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, Product>);
  }, [products]);
  
  const productBarcodeFinder = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.barcode) {
        acc[p.barcode] = p;
      }
      return acc;
    }, {} as Record<string, Product>);
  }, [products]);


  const handleRemoveFromCart = (productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.productId !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    // For custom items (not in inventory), there's no stock check
    if (!productId.startsWith('custom-')) {
        const product = productFinder[productId];
        if (!product) return;

        if (newQuantity > product.stock) {
        toast({
            title: t('notEnoughStock'),
            description: t('notEnoughStockDescription', { stock: product.stock, productName: product.name }),
            variant: "destructive",
        });
        // Cap at max stock
        setCart(currentCart => currentCart.map(item => item.productId === productId ? { ...item, quantity: product.stock } : item));
        return;
        }
    }
    
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(currentCart => currentCart.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const handleSelectProduct = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: t('notEnoughStock'),
          description: t('notEnoughStockDescription', { stock: product.stock, productName: product.name }),
          variant: 'destructive',
        });
        return;
      }
      // Increment quantity if item already in cart
      handleUpdateCartQuantity(product.id, existingItem.quantity + 1);

    } else {
      // Add new item to cart
      setCart(currentCart => [...currentCart, { 
        productId: product.id, 
        name: product.name, 
        priceUSD: product.priceUSD, 
        purchasePriceUSD: product.purchasePriceUSD,
        quantity: 1 
      }]);
    }
    toast({
      title: t('productAddedToCartTitle'),
      description: t('productAddedToCartDescription', { productName: product.name }),
    });
  };

  const handleAddCustomItem = useCallback((item: {name: string, salePrice: number, purchasePrice: number, quantity: number}) => {
    const salePriceUSD = convertFromSelectedCurrencyToUSD(item.salePrice);
    const purchasePriceUSD = convertFromSelectedCurrencyToUSD(item.purchasePrice);
    
    const customItem: SaleItem = {
      productId: `custom-${Date.now()}`,
      name: item.name,
      priceUSD: salePriceUSD,
      purchasePriceUSD: purchasePriceUSD,
      quantity: item.quantity
    };
    setCart(currentCart => [...currentCart, customItem]);
    setIsCustomItemModalOpen(false);
    toast({
      title: t('customItemAddedTitle'),
      description: t('customItemAddedDescription', { itemName: item.name }),
    });
  }, [convertFromSelectedCurrencyToUSD, t, toast]);


  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);
    toast({
        title: t('customerSelectedTitle'),
        description: t('customerSelectedDescription', {name: customer.name})
    })
  };
  
  const handleScanSuccess = (decodedText: string) => {
    const product = productBarcodeFinder[decodedText];
    if (product) {
      handleSelectProduct(product);
      // Optional: close scanner on successful scan, or keep it open for multiple scans
      // setIsBarcodeScannerOpen(false);
    } else {
      toast({
        title: t('barcodeNotFoundTitle'),
        description: t('barcodeNotFoundDescription', { barcode: decodedText }),
        variant: 'destructive'
      });
    }
  };


  const subtotalUSD = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
  }, [cart]);

  const discountAmountUSD = useMemo(() => {
    const numericDiscount = parseFloat(discountValue) || 0;
    if (numericDiscount <= 0) return 0;

    if (discountType === 'percentage') {
      if (numericDiscount > 100) return subtotalUSD; // Cap at 100%
      return subtotalUSD * (numericDiscount / 100);
    } else { // 'fixed'
      const fixedDiscountUSD = convertFromSelectedCurrencyToUSD(numericDiscount);
      return Math.min(fixedDiscountUSD, subtotalUSD); // Cannot discount more than subtotal
    }
  }, [subtotalUSD, discountValue, discountType, convertFromSelectedCurrencyToUSD]);

  const totalUSD = useMemo(() => {
    return subtotalUSD - discountAmountUSD;
  }, [subtotalUSD, discountAmountUSD]);

  const resetForm = useCallback(() => {
    setCart([]);
    setDiscountValue('');
    setDiscountType('percentage');
    setSelectedCustomer(null);
    setPaymentMethod('paid');
    setPartialAmountPaid('');
  }, []);

  const handleRecordSale = () => {
    if (!selectedCustomer) {
      toast({ title: t('customerNotSelectedTitle'), description: t('customerNotSelectedDesc'), variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: t('cartIsEmptyTitle'), description: t('cartIsEmptyDesc'), variant: "destructive" });
      return;
    }

    const partialAmountPaidNumber = parseFloat(partialAmountPaid) || 0;
    const partialAmountPaidUSD = convertFromSelectedCurrencyToUSD(partialAmountPaidNumber);

    if (paymentMethod === 'partial' && (partialAmountPaidNumber <= 0 || partialAmountPaidUSD >= totalUSD)) {
         toast({ title: tg('errorTitle'), description: t('partialPaymentError'), variant: "destructive" });
         return;
    }

    setIsProcessing(true);

    recordNewSaleTransaction({
      cart,
      customer: selectedCustomer,
      totalUSD,
      paymentMethod,
      partialAmountPaidUSD: paymentMethod === 'partial' ? partialAmountPaidUSD : undefined,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      discountAmountUSD,
    })
    .then((newSale) => {
      showPrintToast(newSale);
      resetForm();
    })
    .catch((error) => {
      console.error("Failed to record sale:", error);
       toast({
          title: tg('errorTitle'),
          description: (error as Error).message || t('saleRecordError'),
          variant: "destructive"
      });
    })
    .finally(() => {
        setIsProcessing(false);
    });
  }


  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={t('title')}
          description={t('description')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">{t('newSaleCardTitle')}</CardTitle> 
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="customer">{t('customerLabel')}</Label>
                    <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsCustomerModalOpen(true)}>
                        {selectedCustomer ? (
                            <span className="text-foreground flex items-center gap-2"><User className="h-4 w-4" />{selectedCustomer.name}</span>
                        ) : (
                        <span className="flex items-center gap-2"><User className="h-4 w-4" />{t('selectCustomerPlaceholder')}</span>
                        )}
                    </Button>
                    {selectedCustomer && (
                        <Card className="mt-2">
                            <CardContent className="p-3 text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground"/>
                                    <span className="dir-ltr">{selectedCustomer.phone || t_customers('phoneLabel') + ': N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground"/>
                                    <span>{selectedCustomer.location || t_customers('locationLabel') + ': N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground"/>
                                    <span>{t_customer_details('outstandingDebt')}: <Badge variant={selectedCustomer.totalDebtUSD > 0 ? "destructive" : "default"}>{formatCurrency(selectedCustomer.totalDebtUSD)}</Badge></span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div>
                  <Label htmlFor="sale-date">{t('saleDateLabel')}</Label>
                  <Input id="sale-date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} />
                </div>
              </div>

              <div>
                <Label>{t('addProductLabel')}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsProductModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" /> {t('browseProductsButton')}
                    </Button>
                     <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsBarcodeScannerOpen(true)}>
                        <ScanBarcode className="h-4 w-4" /> {t('scanBarcodeButton')}
                    </Button>
                     <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsCustomItemModalOpen(true)}>
                        <ConciergeBell className="h-4 w-4" /> {t('addCustomItemButton')}
                    </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                  <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>{tg('no')}</TableHead>
                          <TableHead>{t('tableHeaderProduct')}</TableHead>
                          <TableHead className="text-center">{t('tableHeaderQuantity')}</TableHead>
                          <TableHead className="text-end">{t('tableHeaderPrice', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                          <TableHead className="text-end">{t('tableHeaderTotal', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                          <TableHead className="text-center">{t('tableHeaderAction')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {cart.length === 0 && (
                              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">{t('noItemsInCart')}</TableCell></TableRow>
                          )}
                          {cart.map((item, index) => (
                              <TableRow key={item.productId}>
                                  <TableCell className="font-mono">{index + 1}</TableCell>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell className="w-28 text-center">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateCartQuantity(item.productId, parseInt(e.target.value, 10))}
                                      className="h-8 text-center"
                                      min="1"
                                      max={!item.productId.startsWith('custom-') ? (productFinder[item.productId]?.stock || item.quantity) : undefined}
                                    />
                                  </TableCell>
                                  <TableCell className="text-end">{formatCurrency(item.priceUSD)}</TableCell>
                                  <TableCell className="text-end">{formatCurrency(item.priceUSD * item.quantity)}</TableCell>
                                  <TableCell className="text-center">
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveFromCart(item.productId)}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="discount">{t('discountLabel')}</Label>
                      <div className="flex items-center">
                          <Input 
                            id="discount" 
                            type="number" 
                            placeholder="0" 
                            className="rounded-e-none focus:z-10 relative"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            min="0"
                          />
                          <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}>
                            <SelectTrigger className="w-[80px] rounded-s-none border-s-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">{selectedCurrency.symbol}</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <div>
                      <Label htmlFor="payment-status">{t('paymentStatusLabel')}</Label>
                      <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'paid' | 'debt' | 'partial')}>
                          <SelectTrigger id="payment-status">
                          <SelectValue placeholder={t('selectStatusPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="paid">{t('paidInFullStatus')}</SelectItem>
                          <SelectItem value="partial">{t('partialPaymentStatus')}</SelectItem>
                          <SelectItem value="debt">{t('fullDebtStatus')}</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              {paymentMethod === 'partial' && (
                <div>
                  <Label htmlFor="partial-amount">{t('partialAmountLabel', { currency: selectedCurrency.symbol })}</Label>
                  <Input
                    id="partial-amount"
                    type="number"
                    placeholder="0.00"
                    value={partialAmountPaid}
                    onChange={(e) => setPartialAmountPaid(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                      {t('remainingDebtLabel', { amount: formatCurrency(totalUSD - convertFromSelectedCurrencyToUSD(parseFloat(partialAmountPaid) || 0))})}
                  </p>
                </div>
              )}
            </CardContent>
            <Separator className="my-4" />
            <CardFooter className="flex flex-col items-start rtl:items-end space-y-2">
              <div className="text-lg font-semibold">{t('subtotalLabel', {amount: formatCurrency(subtotalUSD)})}</div>
              <div className="text-muted-foreground">{t('discountAmountLabel', {amount: formatCurrency(discountAmountUSD)})}</div>
              <div className="text-xl font-bold text-primary">{t('totalAmountLabel', {amount: formatCurrency(totalUSD)})}</div>
              <Button size="lg" className="w-full md:w-auto mt-4" onClick={handleRecordSale} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <DollarSign className="h-5 w-5" />}
                {t('recordSaleButton')}
              </Button>
            </CardFooter>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline">{t('recentSalesCardTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {recentSales.map(sale => (
                        <div key={sale.id} className="flex items-center justify-between p-3">
                            <div>
                                <p className="font-medium">{sale.customerName}</p>
                                <p className="text-sm text-muted-foreground">{new Date(sale.date).toLocaleDateString(locale)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{formatCurrency(sale.totalUSD)}</p>
                                <Badge variant={sale.status === 'Paid' ? 'default' : 'destructive'} className="text-xs">
                                    {sale.status === 'Paid' ? t('paidStatus') : t('debtStatus')}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {recentSales.length === 0 && (
                        <p className="p-4 text-center text-muted-foreground">{t('noSalesRecorded')}</p>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>

        {isProductModalOpen && <ProductSelectionModal 
            isOpen={isProductModalOpen}
            onOpenChange={setIsProductModalOpen}
            onSelectProduct={handleSelectProduct}
            products={products}
            currencyFormatter={formatCurrency}
            translateCategory={translateCategory}
            t={t}
        />}

        {isCustomerModalOpen && <CustomerSelectionModal 
            isOpen={isCustomerModalOpen}
            onOpenChange={setIsCustomerModalOpen}
            onSelectCustomer={handleSelectCustomer}
            t_sales={t}
            t_customers={t_customers}
            t_general={tg}
        />}
        
        {isBarcodeScannerOpen && <BarcodeScanner
            isOpen={isBarcodeScannerOpen}
            onOpenChange={setIsBarcodeScannerOpen}
            onScanSuccess={handleScanSuccess}
            t={t}
        />}

        <CustomItemModal
            isOpen={isCustomItemModalOpen}
            onOpenChange={setIsCustomItemModalOpen}
            onAddItem={handleAddCustomItem}
            t={t}
            tg={tg}
            currencySymbol={selectedCurrency.symbol}
        />
      </div>
      
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
          t={t}
          tg={tg}
        />
      )}
    </>
  );
}
