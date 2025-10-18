import React from 'react';
import { Group, Rect, Text } from 'react-konva';

/**
 * OwnershipTooltip Component
 * Displays a tooltip showing who owns/is editing an object
 * Appears on hover for locked objects
 */
const OwnershipTooltip = ({ x, y, ownerName, ownerColor, stageScale = 1 }) => {
  if (!ownerName) return null;

  const tooltipText = `Being edited by ${ownerName}`;
  
  // Scale tooltip elements based on stage zoom level
  const fontSize = 12 / stageScale;
  const padding = 8 / stageScale;
  const borderRadius = 4 / stageScale;
  
  // Estimate text width (rough approximation)
  const charWidth = fontSize * 0.6;
  const textWidth = tooltipText.length * charWidth;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;
  
  // Position tooltip above and to the right of cursor
  const offsetX = 10 / stageScale;
  const offsetY = -boxHeight - 10 / stageScale;

  return (
    <Group
      x={x + offsetX}
      y={y + offsetY}
      listening={false}
    >
      {/* Tooltip background */}
      <Rect
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        fill={ownerColor || '#333333'}
        cornerRadius={borderRadius}
        shadowColor="rgba(0,0,0,0.3)"
        shadowOffsetX={2 / stageScale}
        shadowOffsetY={2 / stageScale}
        shadowBlur={4 / stageScale}
        opacity={0.95}
      />
      
      {/* Tooltip text */}
      <Text
        x={padding}
        y={padding}
        text={tooltipText}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
        align="left"
        verticalAlign="middle"
      />
    </Group>
  );
};

export default OwnershipTooltip;

