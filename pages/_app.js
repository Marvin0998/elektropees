import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Service Worker registrieren
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('SW registriert:', reg.scope)
          // Benachrichtigungen anfragen
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
          }
        })
        .catch(err => console.log('SW Fehler:', err))
    }
  }, [])

  return <Component {...pageProps} />
}
