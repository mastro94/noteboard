import React from 'react'

export default function BoardManager({
  isAPI,
  boards,
  activeBoardId,
  onSelectBoard,
  newBoardTitle,
  setNewBoardTitle,
  onCreateBoard,
  onDeleteBoard,
}) {
  if (!isAPI) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Board Manager</h2>
        <p style={{ opacity: 0.8 }}>
          Disponibile solo in modalità API (VITE_MODE=api).
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Board Manager</h2>

      <form onSubmit={onCreateBoard} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input
          className="input"
          value={newBoardTitle}
          onChange={(e) => setNewBoardTitle(e.target.value)}
          placeholder="Nome nuova board…"
        />
        <button className="primaryBtn" type="submit">Crea</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boards.length ? boards.map(b => {
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

              <button
                type="button"
                className="btn"
                onClick={() => onDeleteBoard(b.id)}
                title="Elimina board"
              >
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
