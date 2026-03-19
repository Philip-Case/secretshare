import { useState, useEffect } from 'react'
import Head from 'next/head'

// ── crypto helpers ──────────────────────────────────────────────
function b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))) }
function unb64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)) }

async function deriveKey(pass, salt) {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

async function encryptMsg(text, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pass, salt)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct) }
}

async function decryptMsg(data, pass) {
  const key = await deriveKey(pass, unb64(data.salt))
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(data.iv) }, key, unb64(data.ct))
  return new TextDecoder().decode(dec)
}
// ───────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState('create')
  const [msg, setMsg] = useState('')
  const [pass, setPass] = useState('')
  const [burn, setBurn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [genUrl, setGenUrl] = useState('')
  const [burnMode, setBurnMode] = useState(true)
  const [createErr, setCreateErr] = useState('')
  const [copied, setCopied] = useState(false)

  // open tab
  const [linkInput, setLinkInput] = useState('')
  const [openPass, setOpenPass] = useState('')
  const [openLoading, setOpenLoading] = useState(false)
  const [openErr, setOpenErr] = useState('')
  const [openResult, setOpenResult] = useState(null) // null | { text, burn } | 'burned'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const id = params.get('id')
    if (id) {
      setTab('open')
      setLinkInput(window.location.href)
    }
  }, [])

  async function handleCreate() {
    setCreateErr('')
    if (!msg.trim()) { setCreateErr('Please enter a secret message.'); return }
    if (!pass) { setCreateErr('Please enter a passphrase.'); return }
    setLoading(true)
    try {
      const encrypted = await encryptMsg(msg, pass)
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...encrypted, burn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const url = `${window.location.origin}/#id=${data.id}`
      setGenUrl(url)
      setBurnMode(burn)
      setMsg('')
      setPass('')
    } catch (e) {
      setCreateErr('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen() {
    setOpenErr('')
    setOpenResult(null)
    const src = linkInput || (typeof window !== 'undefined' ? window.location.href : '')
    let id = ''
    try {
      const hash = src.includes('#') ? src.split('#')[1] : ''
      id = new URLSearchParams(hash).get('id') || ''
    } catch {}
    if (!id) { setOpenErr('No secret ID found in that link.'); return }
    if (!openPass) { setOpenErr('Please enter the passphrase.'); return }
    setOpenLoading(true)
    try {
      const res = await fetch(`/api/get?id=${id}`)
      if (res.status === 404) { setOpenResult('burned'); return }
      if (!res.ok) throw new Error('Server error')
      const record = await res.json()
      const plaintext = await decryptMsg(record, openPass)
      setOpenResult({ text: plaintext, burn: record.burn })
    } catch (e) {
      if (e.name === 'OperationError') setOpenErr('Wrong passphrase — decryption failed.')
      else if (e.message === 'Server error') setOpenErr('Server error. Try again.')
      else setOpenErr('Decryption failed. Check the passphrase.')
    } finally {
      setOpenLoading(false)
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(genUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <>
      <Head>
        <title>SecretShare — Encrypted one-time messages</title>
        <meta name="description" content="Send encrypted secrets with burn-after-reading. End-to-end AES-256 encryption." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="noise" />
      <div className="glow" />

      <div className="container">
        <div className="logo">
          <div className="logo-icon">🔒</div>
          <div className="logo-text">Secret<span>Share</span></div>
        </div>

        <div className="card">
          <div className="tabs">
            <button className={`tab-btn ${tab === 'create' ? 'active' : ''}`} onClick={() => { setTab('create'); setGenUrl(''); setCreateErr('') }}>
              Create secret
            </button>
            <button className={`tab-btn ${tab === 'open' ? 'active' : ''}`} onClick={() => { setTab('open'); setOpenResult(null); setOpenErr('') }}>
              Open secret
            </button>
          </div>

          {tab === 'create' && (
            <div className="panel">
              <div className="field">
                <label>Secret message</label>
                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Paste your password, API key, private note..."
                />
              </div>

              <div className="field">
                <label>Passphrase</label>
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Choose a strong passphrase"
                />
              </div>

              <div className="toggle-row" onClick={() => setBurn(b => !b)}>
                <label className="switch" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={burn} onChange={e => setBurn(e.target.checked)} />
                  <span className="knob" />
                </label>
                <div className="toggle-info">
                  <div className="toggle-title">Burn after reading</div>
                  <div className="toggle-sub">Permanently deleted after the first view</div>
                </div>
              </div>

              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Encrypting...' : 'Encrypt & generate link'}
              </button>

              {createErr && <p className="err">{createErr}</p>}

              {genUrl && (
                <div className="result">
                  <div className="divider" />
                  <div className="result-box">
                    <span className={`badge ${burnMode ? 'burn' : 'safe'}`}>
                      {burnMode ? '🔥 Burn after reading' : '✓ Persistent'}
                    </span>
                    <div className="result-label">Shareable link</div>
                    <div className="url-text">{genUrl}</div>
                    <button className="copy-btn" onClick={copyUrl}>
                      {copied ? '✓ Copied!' : 'Copy link'}
                    </button>
                  </div>
                  <div className="warning">
                    <span>⚠</span>
                    <span>Send the <strong>passphrase separately</strong> — never in the same message as this link.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'open' && (
            <div className="panel">
              <div className="field">
                <label>Secret link</label>
                <input
                  type="text"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  placeholder="Paste the secret link here"
                />
              </div>

              <div className="field">
                <label>Passphrase</label>
                <input
                  type="password"
                  value={openPass}
                  onChange={e => setOpenPass(e.target.value)}
                  placeholder="Enter the passphrase you were given"
                  onKeyDown={e => e.key === 'Enter' && handleOpen()}
                />
              </div>

              <button className="btn-primary" onClick={handleOpen} disabled={openLoading}>
                {openLoading ? 'Decrypting...' : 'Decrypt secret'}
              </button>

              {openErr && <p className="err">{openErr}</p>}

              {openResult === 'burned' && (
                <div className="result">
                  <div className="burned">
                    <div className="burned-icon">🔥</div>
                    <h3>Secret not found</h3>
                    <p>This secret has already been burned, or it never existed.</p>
                  </div>
                </div>
              )}

              {openResult && openResult !== 'burned' && (
                <div className="result">
                  <div className="divider" />
                  <div className="result-box">
                    <span className={`badge ${openResult.burn ? 'burn' : 'safe'}`}>
                      {openResult.burn ? '🔥 Burned — this was the last view' : '✓ Persistent secret'}
                    </span>
                    <div className="result-label">Decrypted message</div>
                    <div className="secret-text">
                      {openResult.text}
                    </div>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(openResult.text)
                        const btn = document.activeElement
                        btn.textContent = '✓ Copied!'
                        setTimeout(() => btn.textContent = 'Copy text', 1500)
                      }}
                      style={{ marginTop: 10 }}
                    >
                      Copy text
                    </button>
                    {openResult.burn && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                        The secret has been permanently deleted from the server.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="footer">
          AES-256-GCM · PBKDF2 · <span>End-to-end encrypted</span>
        </p>
      </div>
    </>
  )
}
