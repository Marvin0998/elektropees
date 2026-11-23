// Kamera-Scanner fürs Lager (ZXing, läuft auch in iOS-Safari / Home-Bildschirm-App).
// Liest EAN-13/8, UPC, Code 128/39, ITF, QR und Data Matrix. Die kleine Bibliothek wird erst beim Öffnen geladen.
import { useEffect, useRef, useState } from 'react'
import { normalisiereCode } from '../lib/lager'

function piep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC(); const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 1040; g.gain.value = 0.08
    o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => { o.stop(); ctx.close() }, 110)
  } catch (e) { /* kein Ton – egal */ }
  try { if (navigator.vibrate) navigator.vibrate(40) } catch (e) { /* iOS kennt das nicht */ }
}

function kameraFehler(e) {
  const n = e && e.name
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Kamera nicht erlaubt. Auf dem iPhone: Einstellungen → Safari → Kamera → „Erlauben“ (bzw. für die App). Bis dahin kannst du den Code unten eintippen.'
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Keine Kamera gefunden. Du kannst den Code unten eintippen.'
  if (n === 'NotReadableError') return 'Die Kamera wird gerade von einer anderen App benutzt.'
  return 'Die Kamera konnte nicht gestartet werden: ' + ((e && e.message) || e)
}

export default function LagerScanner({ onCode, pausiert = false }) {
  const videoRef = useRef(null)
  const stopRef = useRef(null)
  const letzter = useRef({ code: '', zeit: 0 })
  const pauseRef = useRef(pausiert)
  const cbRef = useRef(onCode)
  const [status, setStatus] = useState('aus')      // aus | startet | laeuft | fehler
  const [fehler, setFehler] = useState('')
  pauseRef.current = pausiert; cbRef.current = onCode

  async function starten() {
    if (stopRef.current) return
    setStatus('startet'); setFehler('')
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('Kamera-Zugriff wird hier nicht unterstützt (nur über https).'), { name: 'NotFoundError' })
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX])
      hints.set(DecodeHintType.TRY_HARDER, true)
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 90 })
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        result => {
          if (!result || pauseRef.current) return
          const code = normalisiereCode(result.getText())
          const jetzt = Date.now()
          // Bleibt derselbe Code im Bild, zählt er nur einmal; erst wenn er >2,5 s weg war, zählt er wieder
          if (code === letzter.current.code && jetzt - letzter.current.zeit < 2500) { letzter.current.zeit = jetzt; return }
          if (!code) return
          letzter.current = { code, zeit: jetzt }
          piep(); cbRef.current && cbRef.current(code)
        })
      stopRef.current = () => { try { controls.stop() } catch (e) { /* schon beendet */ } }
      setStatus('laeuft')
    } catch (e) { stopRef.current = null; setStatus('fehler'); setFehler(kameraFehler(e)) }
  }
  function stoppen() { if (stopRef.current) { stopRef.current(); stopRef.current = null }; setStatus('aus') }

  useEffect(() => { starten(); return () => { if (stopRef.current) { stopRef.current(); stopRef.current = null } } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Nach dem Buchen hält man die Kamera oft noch auf dem Etikett: derselbe Code löst nicht gleich nochmal aus
  useEffect(() => { if (!pausiert) letzter.current = { code: letzter.current.code, zeit: Date.now() } }, [pausiert])

  return (
    <div className="lg-kamera">
      <video ref={videoRef} className="lg-video" playsInline muted autoPlay />
      {status === 'laeuft' && <div className="lg-rahmen" aria-hidden="true"><span /></div>}
      {status !== 'laeuft' && (
        <div className="lg-kamera-info">
          {status === 'startet' && <div>Kamera startet …</div>}
          {status === 'fehler' && <><div className="lg-kamera-fehler">{fehler}</div><button className="btn btn-secondary btn-sm" onClick={starten}>Nochmal versuchen</button></>}
          {status === 'aus' && <button className="btn btn-primary btn-sm" onClick={starten}>📷 Kamera starten</button>}
        </div>
      )}
      {status === 'laeuft' && <button className="lg-kamera-aus" onClick={stoppen} aria-label="Kamera ausschalten">✕</button>}
    </div>
  )
}
