
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rawnak Sales',
    short_name: 'Rawnak',
    description: 'Smart sales management system for store owners in Iraq.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F0F4F7',
    theme_color: '#29ABE2',
    orientation: 'portrait',
    scope: '/',
    lang: 'ar',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'البيع السريع',
        short_name: 'بيع',
        description: 'بدء عملية بيع جديدة',
        url: '/ar/sales',
        icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }]
      },
      {
        name: 'المخزون',
        short_name: 'مخزون',
        description: 'إدارة المخزون والمنتجات',
        url: '/ar/inventory',
        icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }]
      }
    ],
  }
}
