import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

import '@fontsource-variable/inter/wght.css'

import faviconLight from '@/assets/favicon-light.png'
import faviconDark from '@/assets/favicon-dark.png'

const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const updateFavicon = () => (favicon.href = prefersDark.matches ? faviconDark : faviconLight)
prefersDark.addEventListener('change', updateFavicon)
updateFavicon()

createApp(App).mount('#app')
