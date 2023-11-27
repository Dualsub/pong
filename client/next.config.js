/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    
    trailingSlash: true,
    skipTrailingSlashRedirect: true,   

    basePath: "/go-mp",
    assetPrefix: "/go-mp/",
}

module.exports = nextConfig
