import React from 'react'
import { createRoot } from 'react-dom/client'
import TheArchitectPlatform from './TheArchitectPlatform'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TheArchitectPlatform />
  </React.StrictMode>
)
