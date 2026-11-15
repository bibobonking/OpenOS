import { createRoot } from 'react-dom/client'
import './index.css'
import { kernel } from './kernel/kernel.ts'
import { Desktop } from './os/Desktop.tsx'

// boot() restores the disk image from storage, or seeds a fresh one.
kernel.boot()

createRoot(document.getElementById('root')!).render(<Desktop />)