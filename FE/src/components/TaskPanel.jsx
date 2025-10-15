import React from 'react'

export default function TaskPanel({
  title, setTitle,
  desc, setDesc,
  addTask,
  query, setQuery,
  exportJSON, importJSON,
  clearDone,
  tags,
  selectedTagId, setSelectedTagId,
  selectedTagObj,
  isFilterActive, toggleTagFilter,
  selectedPriority, setSelectedPriority,
  PRIORITY_EMOJI
}) {
  return (
    <section className="toolbar" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* NUOVO TASK */}
      <form className="card addForm" onSubmit={addTask} style={{ gap: 12 }}>
        <div className="row" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input
            className="input"
            placeholder="Titolo del task…"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Descrizione (opzionale)"
            value={desc}
            onChange={e=>setDesc(e.target.value)}
          />

          {/* Tag select */}
          <select
            className="input"
            value={selectedTagId}
            onChange={(e)=> setSelectedTagId(e.target.value)}
            title="Seleziona un tag (opzionale)"
            style={{ minWidth: 180 }}
          >
            <option value="">— nessun tag —</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* badge colore tag selezionato */}
          {selectedTagObj && (
            <span title={`Colore ${selectedTagObj.color}`} className="colorBadge" style={{ background:selectedTagObj.color || '#e5e7eb' }} />
          )}

          {/* Priorità con emoji */}
          <select
            className="input"
            value={selectedPriority}
            onChange={(e)=> setSelectedPriority(e.target.value)}
            title="Priorità"
            style={{ minWidth: 170 }}
          >
            <option value="LOW">{PRIORITY_EMOJI.LOW} LOW</option>
            <option value="MEDIUM">{PRIORITY_EMOJI.MEDIUM} MEDIUM</option>
            <option value="HIGH">{PRIORITY_EMOJI.HIGH} HIGH</option>
            <option value="HIGHEST">{PRIORITY_EMOJI.HIGHEST} HIGHEST</option>
          </select>

          {/* filtro rapido sul tag selezionato */}
          <button
            type="button"
            className={isFilterActive ? 'warnBtn' : 'btn'}
            onClick={toggleTagFilter}
            title={isFilterActive ? 'Mostra tutti i task' : 'Mostra solo i task con questo tag'}
          >
            {isFilterActive ? 'Mostra tutti' : 'Filtra per tag selezionato'}
          </button>

          <button className="primaryBtn" type="submit">Aggiungi</button>
        </div>
      </form>

      {/* STRUMENTI */}
      <div className="card toolsRight" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" placeholder="🔎 Cerca…" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="btn" onClick={exportJSON}>Export JSON</button>
        <label className="importLabel">Import JSON
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importJSON} />
        </label>
        <button className="warnBtn" onClick={clearDone}>Svuota Done</button>
      </div>
    </section>
  )
}
