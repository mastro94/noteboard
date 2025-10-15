import React from 'react'

export default function TagManager({
  newTagName, setNewTagName,
  newTagColor, setNewTagColor,
  onCreateTag,
  tags, onDeleteTag,
  presetColors
}) {
  return (
    <section className="toolbar" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* CREA TAG */}
      <form className="card addForm" onSubmit={onCreateTag} style={{ gap: 12, alignItems: 'stretch' }}>
        <div className="row" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input
            className="input"
            placeholder="Nome nuovo tag…"
            value={newTagName}
            onChange={e=>setNewTagName(e.target.value)}
            title="Nome del tag"
            required
          />
            <div className="colorPicker">
                <div className="swatches">
                    {presetColors.map(({ hex, name }) => (
                    <button
                        key={hex}
                        type="button"
                        title={name} // 👈 mostra il nome del colore in hover
                        className={`swatch ${newTagColor===hex ? 'selected' : ''}`}
                        style={{ background:hex }}
                        onClick={()=>setNewTagColor(hex)}
                    />
                    ))}
                </div>
                <div className="preview" title={`Colore selezionato: ${presetColors.find(c => c.hex === newTagColor)?.name || newTagColor}`} style={{ background:newTagColor }} />
            </div>
          <button className="primaryBtn" type="submit">Aggiungi Tag</button>
        </div>
      </form>

      {/* LISTA TAG */}
      <div className="card" style={{ width:'100%', display:'flex', flexWrap:'wrap', gap:8 }}>
        {tags.length > 0 ? (
          tags.map(t => (
            <span key={t.id} className="tagChip" style={{ background:t.color || '#e5e7eb' }}>
              <span className="tagDot" style={{ background:t.color || '#9ca3af' }} />
              <span className="tagText">{t.name}</span>
              <button
                type="button"
                className="dangerBtn small"
                title={`Elimina "${t.name}"`}
                onClick={() => onDeleteTag(t.id)}
              >
                Elimina
              </button>
            </span>
          ))
        ) : (
          <span style={{ fontSize:12, opacity:.7 }}>Nessun tag creato</span>
        )}
      </div>
    </section>
  )
}
