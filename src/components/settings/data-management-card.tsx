'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CloudUpload, RefreshCw, Upload } from 'lucide-react';

interface DataManagementCardProps {
    onSuccess: () => void;
}

export default function DataManagementCard({ onSuccess }: DataManagementCardProps) {
    const t = useTranslations('SettingsPage');
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const downloadJSON = (data: unknown, filename: string) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleBackupAllData = () => {
        const backupData = {
            branches: localStorage.getItem('branches'),
            activeBranchId: localStorage.getItem('activeBranchId'),
            notificationSettings: localStorage.getItem('notificationSettings'),
            users: localStorage.getItem('users'),
            allData: Object.keys(localStorage).reduce((obj, key) => {
                obj[key] = localStorage.getItem(key);
                return obj;
            }, {} as Record<string, string | null>),
            timestamp: new Date().toISOString(),
        };
        downloadJSON(backupData, `rawnak-sales-full-backup-${new Date().toISOString().split('T')[0]}.json`);
        toast({
            title: t('backupDownloadedTitle'),
            description: t('backupDownloadedDescription'),
        });
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);

                if (!data.allData || typeof data.allData !== 'object') {
                    throw new Error("Invalid backup file format.");
                }

                // Clear existing localStorage before importing
                localStorage.clear();

                // Restore all data
                for (const key in data.allData) {
                    if (data.allData[key] !== null) {
                        localStorage.setItem(key, data.allData[key]);
                    }
                }
                
                toast({
                    title: t('importSuccessTitle'),
                    description: t('importSuccessDescription'),
                });

                // Trigger reload via parent component
                setTimeout(() => {
                    onSuccess();
                }, 1500);

            } catch (error) {
                console.error("Failed to import data:", error);
                toast({
                    title: t('errorTitle'),
                    description: (error as Error).message || 'Failed to parse or import the backup file.',
                    variant: 'destructive',
                });
            } finally {
                // Reset file input to allow re-uploading the same file
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><CloudUpload className="h-5 w-5 text-primary" /> {t('dataManagementTitle')}</CardTitle>
                <CardDescription>{t('dataManagementDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full justify-start gap-2" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                    <span>{t('syncDataButton')}</span>
                </Button>

                <Separator className="my-2" />

                <Button className="w-full justify-between" onClick={handleBackupAllData}>
                    <div className="flex items-center gap-2">
                        <CloudUpload className="h-4 w-4" />
                        <span>{t('backupAllDataButton')}</span>
                    </div>
                    <Badge>JSON</Badge>
                </Button>
                
                <Button variant="outline" className="w-full justify-between" onClick={handleRestoreClick}>
                    <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>{t('importAllDataButton')}</span>
                    </div>
                    <Badge variant="secondary">JSON</Badge>
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".json"
                    className="hidden"
                />
            </CardContent>
        </Card>
    );
}
