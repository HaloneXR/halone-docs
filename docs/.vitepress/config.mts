import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, type DefaultTheme } from 'vitepress'

const referenceSidebar = new URL('../web/reference/typedoc-sidebar.json', import.meta.url)
const generated: DefaultTheme.SidebarItem[] = existsSync(referenceSidebar)
  ? JSON.parse(readFileSync(referenceSidebar, 'utf8'))
  : []

const webGuide: DefaultTheme.SidebarItem[] = [
  {
    text: 'Introduction',
    items: [
      { text: 'Getting started', link: '/web/getting-started' },
      { text: 'The manifest', link: '/web/manifest' },
      { text: 'Permissions', link: '/web/permissions' },
      { text: 'The halone CLI', link: '/web/cli' },
      { text: 'The simulator', link: '/web/simulator' },
      { text: 'How the bridge works', link: '/web/bridge' },
    ],
  },
  {
    text: 'Recipes',
    items: [
      { text: 'Shaping the window', link: '/web/recipes/window' },
      { text: 'Context menus', link: '/web/recipes/menus' },
      { text: 'The clipboard', link: '/web/recipes/clipboard' },
      { text: 'TCP sockets', link: '/web/recipes/sockets' },
      { text: 'Files', link: '/web/recipes/files' },
      { text: 'Stereo and 360° video', link: '/web/recipes/media' },
      { text: 'Launching other apps', link: '/web/recipes/apps' },
    ],
  },
]

const webReference: DefaultTheme.SidebarItem[] = [
  {
    text: 'API reference',
    items: [
      { text: 'The halone client', link: '/web/api' },
      { text: '@halone/sdk', link: '/web/reference/' },
    ],
  },
  ...generated,
]

const nativeGuide: DefaultTheme.SidebarItem[] = [
  {
    text: 'Introduction',
    items: [
      { text: 'Getting started', link: '/native/getting-started' },
      { text: 'Plugins and sessions', link: '/native/concepts' },
    ],
  },
  {
    text: 'Recipes',
    items: [
      { text: 'Drawing with a Canvas', link: '/native/recipes/canvas' },
      { text: 'Android views', link: '/native/recipes/views' },
      { text: "The phone's keyboard", link: '/native/recipes/keyboard' },
      { text: 'Status items in the dock', link: '/native/recipes/status-items' },
    ],
  },
  {
    text: 'API reference',
    items: [{ text: 'dev.halone.plugin', link: '/native/reference' }],
  },
]

const hardware: DefaultTheme.SidebarItem[] = [
  {
    text: 'Hardware',
    items: [
      { text: 'Adding support for new glasses', link: '/hardware/' },
      { text: 'Development actions', link: '/hardware/dev-actions' },
      { text: 'XREAL Air HID protocol', link: '/hardware/xreal-hid' },
    ],
  },
  {
    text: 'Design',
    items: [
      { text: 'Following, layout and collisions', link: '/hardware/multi-panel' },
      { text: 'ADR 0001: Vendor-neutral drivers', link: '/hardware/adr/0001-vendor-neutral-driver-layer' },
      { text: 'ADR 0002: Panels own their state', link: '/hardware/adr/0002-panels-own-their-state' },
    ],
  },
]

export default defineConfig({
  title: 'Halone',
  description: 'Developer documentation for Halone, the XR environment for XREAL glasses',
  lang: 'en-US',
  base: '/',
  cleanUrls: true,
  lastUpdated: false,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['meta', { name: 'theme-color', content: '#0b0e14' }],
  ],
  sitemap: { hostname: 'https://halone.dev' },
  themeConfig: {
    logo: '/logo.png',
    nav: [
      {
        text: 'Web SDK',
        activeMatch: '^/web/',
        items: [
          { text: 'Guide', link: '/web/getting-started', activeMatch: '^/web/(?!api|reference)' },
          { text: 'API reference', link: '/web/api', activeMatch: '^/web/(api|reference)' },
        ],
      },
      {
        text: 'Native SDK',
        activeMatch: '^/native/',
        items: [
          { text: 'Guide', link: '/native/getting-started', activeMatch: '^/native/(?!reference)' },
          { text: 'API reference', link: '/native/reference' },
        ],
      },
      { text: 'Hardware', link: '/hardware/', activeMatch: '^/hardware/' },
      { text: 'halone.app', link: 'https://halone.app' },
    ],
    sidebar: {
      '/web/api': webReference,
      '/web/reference/': webReference,
      '/web/': webGuide,
      '/native/': nativeGuide,
      '/hardware/': hardware,
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/HaloneXR' }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 TheBITLINK',
    },
  },
})
