import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeWhenMraidReady } from './mraid'
import { handleMraidOpen } from './clickthrough'

window.handleMraidOpen = handleMraidOpen
window.openClickThrough = () => handleMraidOpen()

initializeWhenMraidReady(() => {
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

})
