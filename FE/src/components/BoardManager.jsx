// BoardManager.jsx (MODIFICATO)
import React, { useEffect, useMemo, useState } from 'react'

export default function BoardManager({
  isAPI,
  boards,
  activeBoardId,
  onSelectBoard,
  newBoardTitle,
  setNewBoardTitle,
  onCreateBoard,
  onDeleteBoard,

  // invites
  onCreateInvite,
  canInvite = true,

  // rename
  onRenameBoard,
  canRename = true,
}) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteErr, setInviteErr] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [renameErr, setRenameErr] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const activeBoard = useMemo(
    () => (boards || []).find(b => String(b.id) === String(activeBoardId)),
    [boards, activeBoardId]
  )
  const activeTitle = activeBoard?.title || ''

  useEffect(() => {
    setEditTitle(activeTitle)
    setRenameErr('')
    setInviteErr('')
    setInviteLink('')
  }, [activeBoardId, activeTitle])

  if (!isAPI) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Board Manager</h2>
        <p style={{ opacity: 0.8 }}>Disponibile solo in modalità API (VITE_MODE=api).</p>
      </div>
    )
  }

  async function handleInviteSubmit(e) {
    e.preventDefault()
    setInviteErr('')
    setInviteLink('')

    const email = inviteEmail.trim().toLowerCase()
    if (!activeBoardId) return setInviteErr('Seleziona prima una board.')
    if (!email) return setInviteErr('Inserisci una email valida.')
    if (!onCreateInvite) return setInviteErr('onCreateInvite non configurata.')
    if (!canInvite) return setInviteErr('Permessi insufficienti.')

    try {
      setInviteLoading(true)
      const res = await onCreateInvite(activeBoardId, email, inviteRole)
      setInviteLink(res?.invite_link || '')
      setInviteEmail('')
    } catch (err) {
      setInviteErr(err?.message || 'Invito non riuscito.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRenameSubmit(e) {
    e.preventDefault()
    setRenameErr('')

    if (!activeBoardId) return setRenameErr('Seleziona prima una board.')
    const t = (editTitle || '').trim()
    if (!t) return setRenameErr('Inserisci un nome valido.')
    if (!onRenameBoard) return setRenameErr('onRenameBoard non configurata.')
    if (!canRename) return setRenameErr('Permessi insufficienti.')

    try {
      setRenameLoading(true)
      await onRenameBoard(activeBoardId, t)
    } catch (err) {
      setRenameErr(err?.message || 'Rinomina non riuscita.')
    } finally {
      setRenameLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    try { await navigator.clipboard.writeText(inviteLink) } catch {}
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Board Manager</h2>

      {/* CREA BOARD */}
      <form onSubmit={onCreateBoard} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input
          className="input"
          value={newBoardTitle}
          onChange={(e) => setNewBoardTitle(e.target.value)}
          placeholder="Nome nuova board…"
        />
        <button className="primaryBtn" type="submit">Crea</button>
      </form>

      {/* RINOMINA */}
      <div style={{ margin: '10px 0 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Rinomina board</h3>
          <span style={{ opacity: 0.8, fontSize: 12 }}>
            Attiva: <b>{activeTitle || '—'}</b>
          </span>
        </div>

        <form onSubmit={handleRenameSubmit} style={{ display:'flex', gap: 8, marginTop: 10, flexWrap:'wrap' }}>
          <input
            className="input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Nuovo nome board…"
            style={{ flex: 1, minWidth: 220 }}
            disabled={!activeBoardId || !canRename}
          />
          <button
            className="primaryBtn"
            type="submit"
            disabled={renameLoading || !activeBoardId || !canRename || !(editTitle || '').trim()}
            title={!canRename ? 'Permessi insufficienti' : 'Rinomina'}
          >
            {renameLoading ? 'Salvo…' : 'Salva'}
          </button>
        </form>

        {renameErr ? <div style={{ marginTop: 8, color: '#b42318', fontSize: 13 }}>{renameErr}</div> : null}
      </div>

      {/* INVITA */}
      <div style={{ margin: '10px 0 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Condividi board</h3>
          <span style={{ opacity: 0.8, fontSize: 12 }}>
            Attiva: <b>{activeTitle || '—'}</b>
          </span>
        </div>

        <form onSubmit={handleInviteSubmit} style={{ display:'flex', gap: 8, marginTop: 10, flexWrap:'wrap' }}>
          <input
            className="input"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email da invitare…"
            style={{ flex: 1, minWidth: 220 }}
            disabled={!canInvite}
          />

          <select
            className="btn"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            title="Ruolo"
            style={{ fontWeight: 600 }}
            disabled={!canInvite}
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>

          <button className="primaryBtn" type="submit" disabled={inviteLoading || !activeBoardId || !canInvite}>
            {inviteLoading ? 'Invio…' : 'Invita'}
          </button>
        </form>

        {inviteErr ? <div style={{ marginTop: 8, color: '#b42318', fontSize: 13 }}>{inviteErr}</div> : null}

        {inviteLink ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Link invito</div>
            <div style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
              <input className="input" readOnly value={inviteLink} style={{ flex: 1, minWidth: 240 }} />
              <button type="button" className="btn" onClick={copyLink}>Copia</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* LISTA BOARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boards?.length ? boards.map(b => {
          const isActive = String(b.id) === String(activeBoardId)
          return (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: 10,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <button
                type="button"
                className={isActive ? 'primaryBtn' : 'btn'}
                onClick={() => onSelectBoard(b.id)}
                title="Seleziona board"
                style={{ flex: 1, textAlign: 'left' }}
              >
                {b.title}{isActive ? ' (attiva)' : ''}
              </button>

              <button type="button" className="btn" onClick={() => onDeleteBoard(b.id)} title="Elimina board">
                🗑️
              </button>
            </div>
          )
        }) : (
          <span style={{ opacity: 0.7 }}>Nessuna board. Creane una.</span>
        )}
      </div>
    </div>
  )
}
