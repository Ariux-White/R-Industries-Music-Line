export const dynamic = 'force-static';
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'R Industries Music Line',
    short_name: 'Music Line',
    description: 'Private Neural Streaming Engine by R Industries',
    start_url: '/',
    display: 'standalone', 
    background_color: '#050505',
    theme_color: '#050505',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}