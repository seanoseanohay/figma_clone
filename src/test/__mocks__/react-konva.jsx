// Mock Konva components for testing
// Store props as data attributes to avoid React warnings about invalid DOM props

export const Stage = ({ children, ...props }) => (
  <div data-testid="konva-stage" {...props}>{children}</div>
)

export const Layer = ({ children, ...props }) => (
  <div data-testid="konva-layer" {...props}>{children}</div>
)

export const Group = ({ children, listening, ...props }) => (
  <div data-testid="konva-group" data-listening={listening} {...props}>{children}</div>
)

export const Rect = ({ fill, cornerRadius, shadowColor, shadowOffsetX, shadowOffsetY, shadowBlur, ...props }) => (
  <div 
    data-testid="konva-rect" 
    data-fill={fill}
    data-corner-radius={cornerRadius}
    {...props} 
  />
)

export const Text = ({ text, fontSize, fill, verticalAlign, ...props }) => (
  <div 
    data-testid="konva-text" 
    data-text={text}
    data-font-size={fontSize}
    data-fill={fill}
    data-vertical-align={verticalAlign}
    {...props} 
  />
)

export const Circle = ({ ...props }) => <div data-testid="konva-circle" {...props} />

export const Star = ({ ...props }) => <div data-testid="konva-star" {...props} />

export const Transformer = ({ ...props }) => <div data-testid="konva-transformer" {...props} />

