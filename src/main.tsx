import { createRoot } from 'react-dom/client'
import './index.css'
import { kernel } from './kernel/kernel.ts'
import { Desktop } from './os/Desktop.tsx'

// boot() restores the disk image from storage, or seeds a fresh one and
// writes /system/de.json so the user can edit the DE from Files right away.
kernel.boot()

createRoot(document.getElementById('root')!).render(<Desktop />)