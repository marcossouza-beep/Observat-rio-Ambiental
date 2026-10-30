import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  // A página que se chamava "parecer" passou a ser o "resumo prévio" (/resumos); endereços antigos continuam valendo
  async redirects() {
    return [
      { source: '/pareceres', destination: '/resumos', permanent: true },
      { source: '/pareceres/:slug', destination: '/resumos/:slug', permanent: true },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
