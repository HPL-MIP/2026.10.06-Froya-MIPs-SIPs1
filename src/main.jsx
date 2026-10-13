import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeWhenMraidReady } from './mraid'
import { handleMraidOpen, handleClickAction, handleTap } from './clickthrough'

window.handleMraidOpen = handleMraidOpen
window.handleClickAction = handleClickAction
window.openClickThrough = () => handleMraidOpen()
window.handleTap = handleTap

initializeWhenMraidReady(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
