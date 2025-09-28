
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, type Html5QrcodeError, type Html5QrcodeResult } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Zap, ZapOff, CameraOff, Search, CornerUpLeft } from 'lucide-react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  t: any; // Translations
}

export default function BarcodeScanner({ isOpen, onOpenChange, onScanSuccess, t }: BarcodeScannerProps) {
  const scannerContainerId = 'qr-reader-container';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const isScanningRef = useRef(false);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
            console.warn("Scanner stop failed:", err);
        });
    }
    scannerRef.current = null;
    isScanningRef.current = false;
  }, []);
  
  const handleScanSuccess = useCallback((decodedText: string) => {
    if (!isScanningRef.current) return;
    
    stopScanner(); // Stop immediately on first success
    onScanSuccess(decodedText);

  }, [onScanSuccess, stopScanner]);

  const startScanner = useCallback(async () => {
    if (!document.getElementById(scannerContainerId) || isScanningRef.current) {
        return;
    }
    
    setHasPermission(true);
    isScanningRef.current = true; // Mark as trying to scan

    const html5QrCode = new Html5Qrcode(scannerContainerId, { verbose: false });
    scannerRef.current = html5QrCode;

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            handleScanSuccess,
            (errorMessage) => { /* ignore 'not found' */ }
        );
    } catch (err: any) {
        isScanningRef.current = false;
        setHasPermission(false);
        console.warn("Error starting scanner:", err);
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    if (isOpen) {
      // Delay start to allow dialog to render
      const timer = setTimeout(startScanner, 150);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);
  
  const toggleFlash = () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          const track = scannerRef.current.getRunningTrackCameraCapabilities();
          if (track?.torch) {
              const newFlashState = !isFlashOn;
              scannerRef.current.applyVideoConstraints({
                  torch: newFlashState,
                  advanced: [{ torch: newFlashState }]
              })
              .then(() => setIsFlashOn(newFlashState))
              .catch(err => console.error("Flash toggle failed", err));
          } else {
               alert(t('flashNotSupported'));
          }
      }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (manualBarcode.trim()) {
        handleScanSuccess(manualBarcode.trim());
        setManualBarcode(''); 
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>{t('barcodeScannerTitle')}</DialogTitle>
          <DialogDescription>{t('barcodeScannerDescription')}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleManualSubmit} className="space-y-2">
            <Label htmlFor="manual-barcode">{t('manualBarcodeEntryLabel')}</Label>
            <div className="flex gap-2">
                 <Input
                    id="manual-barcode"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder={t('barcodePlaceholder')}
                />
                <Button type="submit" size="icon" aria-label={t('searchButtonLabel')}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>
        </form>

        <Separator className="my-4" />

        <div id={scannerContainerId} className="relative w-full aspect-square rounded-md overflow-hidden bg-muted">
            {!hasPermission && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <CameraOff className="h-12 w-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-medium">{t('cameraPermissionErrorTitle')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('cameraPermissionErrorDescription')}</p>
                </div>
            )}
        </div>
        <DialogFooter className="flex-row justify-between w-full">
          <Button variant="outline" onClick={toggleFlash} disabled={!hasPermission}>
              {isFlashOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {isFlashOn ? t('turnFlashOff') : t('turnFlashOn')}
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('closeScannerButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    