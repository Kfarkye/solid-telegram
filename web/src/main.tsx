import React from 'react'
import { createRoot } from 'react-dom/client'
import EnhancedArchitectPlatform from './EnhancedArchitectPlatform'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EnhancedArchitectPlatform />
  </React.StrictMode>
)
