import React from 'react'

export default function UserAvatar({ user }) {
  if (!user) return null
  const initials = (user.username || user.email || '?')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || '?'

  return (
    <div className="user-avatar">
      <div className="avatar-circle" aria-label="User avatar">{initials}</div>
      <div className="avatar-tooltip" role="tooltip">
        <div className="tooltip-row"><strong>@{user.username}</strong></div>
        <div className="tooltip-row">{user.email}</div>
      </div>
    </div>
  )
}
