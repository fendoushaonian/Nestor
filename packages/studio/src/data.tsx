import type { ReactNode } from 'react'
import {
  AppleIcon,
  AndroidIcon,
  CompassIcon,
  DeviceIcon,
  GlobeIcon,
  LockIcon,
  SparklesIcon,
  CheckListIcon,
} from './components/icons.js'

export type Template = {
  id: string
  cli: string
  name: string
  desc: string
  recommended?: boolean
  icon: ReactNode
}

export const templates: Template[] = [
  {
    id: 'mobile',
    cli: 'mobile',
    name: 'Mobile App',
    desc: 'React Native + Expo · iOS & Android, one TypeScript codebase',
    recommended: true,
    icon: <DeviceIcon size={26} />,
  },
  {
    id: 'web',
    cli: 'web',
    name: 'Web App',
    desc: 'Vite + TypeScript · ships to the browser',
    icon: <GlobeIcon size={26} />,
  },
]

export type Platform = { id: 'ios' | 'android'; name: string; icon: ReactNode }

export const platforms: Platform[] = [
  { id: 'ios', name: 'iOS', icon: <AppleIcon size={24} /> },
  { id: 'android', name: 'Android', icon: <AndroidIcon size={24} /> },
]

export type Feature = { id: string; name: string; icon: ReactNode }

export const features: Feature[] = [
  { id: 'nav', name: 'Navigation', icon: <CompassIcon size={17} /> },
  { id: 'auth', name: 'Auth', icon: <LockIcon size={17} /> },
  { id: 'ui', name: 'UI Kit', icon: <SparklesIcon size={17} /> },
  { id: 'vitest', name: 'Tests', icon: <CheckListIcon size={17} /> },
]

export const accents: { name: string; value: string }[] = [
  { name: 'Indigo', value: '#5e5ce6' },
  { name: 'Blue', value: '#0a84ff' },
  { name: 'Purple', value: '#bf5af2' },
  { name: 'Pink', value: '#ff375f' },
  { name: 'Orange', value: '#ff9f0a' },
  { name: 'Green', value: '#30d158' },
]
