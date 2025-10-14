import React from 'react'
import { Group, Circle, Text } from 'react-konva'

/**
 * UserCursor Component
 * Renders another user's cursor with username label
 * Only shows position - tool selection is local to each user
 */
const UserCursor = ({ user, stageScale = 1 }) => {
  if (!user || !user.cursorPosition) {
    return null
  }

  const { cursorPosition, displayName = 'Anonymous User', uid } = user
  const { x, y } = cursorPosition

  // Scale cursor elements based on stage zoom level
  // Cursors should remain consistent size regardless of zoom
  const cursorSize = 12 / stageScale
  const fontSize = 12 / stageScale
  const labelOffset = 8 / stageScale
  const labelPadding = 4 / stageScale

  // Generate consistent color for each user based on their ID
  const getUserColor = (userId) => {
    const colors = [
      '#3b82f6', // Blue
      '#ef4444', // Red  
      '#10b981', // Green
      '#f59e0b', // Yellow
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6b7280'  // Gray
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const userColor = getUserColor(uid)
  const displayNameShort = displayName.length > 20 ? 
    displayName.substring(0, 17) + '...' : displayName

  return (
    <Group
      x={x}
      y={y}
      listening={false} // Don't interfere with mouse events
    >
      {/* Cursor dot */}
      <Circle
        x={0}
        y={0}
        radius={cursorSize / 2}
        fill={userColor}
        stroke="#ffffff"
        strokeWidth={2 / stageScale}
        shadowColor="rgba(0,0,0,0.3)"
        shadowOffsetX={1 / stageScale}
        shadowOffsetY={1 / stageScale}
        shadowBlur={3 / stageScale}
      />

      {/* Username label background */}
      <Text
        x={labelOffset}
        y={-cursorSize - labelOffset}
        text={displayNameShort}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
        padding={labelPadding}
        align="left"
        verticalAlign="middle"
        // Background effect using text shadow
        shadowColor={userColor}
        shadowOffsetX={0}
        shadowOffsetY={0}
        shadowBlur={labelPadding * 2}
        shadowOpacity={0.8}
      />

      {/* Username label text (layered on top for better readability) */}
      <Text
        x={labelOffset}
        y={-cursorSize - labelOffset}
        text={displayNameShort}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
        padding={labelPadding}
        align="left"
        verticalAlign="middle"
      />
    </Group>
  )
}

export default UserCursor
