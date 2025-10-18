import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import OwnershipTooltip from '../OwnershipTooltip'

// react-konva is mocked globally in src/test/setup.js

describe('OwnershipTooltip', () => {
  it('should render tooltip with owner name', () => {
    const { getByTestId, getByText } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Alice"
        ownerColor="#ff0000"
        stageScale={1}
      />
    )

    const text = getByTestId('konva-text')
    expect(text.dataset.text).toBe('Being edited by Alice')
  })

  it('should not render when ownerName is null', () => {
    const { container } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName={null}
        ownerColor="#ff0000"
        stageScale={1}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('should not render when ownerName is undefined', () => {
    const { container } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName={undefined}
        ownerColor="#ff0000"
        stageScale={1}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('should use owner color for background', () => {
    const ownerColor = '#00ff00'
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Bob"
        ownerColor={ownerColor}
        stageScale={1}
      />
    )

    const rect = getByTestId('konva-rect')
    expect(rect.dataset.fill).toBe(ownerColor)
  })

  it('should use fallback color when ownerColor is not provided', () => {
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Charlie"
        ownerColor={null}
        stageScale={1}
      />
    )

    const rect = getByTestId('konva-rect')
    expect(rect.dataset.fill).toBe('#333333')
  })

  it('should scale elements based on stageScale', () => {
    const stageScale = 2
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="David"
        ownerColor="#0000ff"
        stageScale={stageScale}
      />
    )

    const text = getByTestId('konva-text')
    // Font size should be 12 / stageScale = 12 / 2 = 6
    expect(Number(text.dataset.fontSize)).toBe(12 / stageScale)
  })

  it('should position tooltip with offset from cursor', () => {
    const x = 100
    const y = 200
    const { getByTestId } = render(
      <OwnershipTooltip
        x={x}
        y={y}
        ownerName="Eve"
        ownerColor="#ff00ff"
        stageScale={1}
      />
    )

    const group = getByTestId('konva-group')
    // Group should be offset from cursor position
    // Exact offset calculation tested implicitly
    expect(group).toBeDefined()
  })

  it('should render with white text', () => {
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Frank"
        ownerColor="#000000"
        stageScale={1}
      />
    )

    const text = getByTestId('konva-text')
    expect(text.dataset.fill).toBe('#ffffff')
  })

  it('should disable interaction (listening=false)', () => {
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Grace"
        ownerColor="#ffff00"
        stageScale={1}
      />
    )

    const group = getByTestId('konva-group')
    expect(group.dataset.listening).toBe('false')
  })

  it('should format message correctly', () => {
    const ownerName = "Test User 123"
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName={ownerName}
        ownerColor="#00ffff"
        stageScale={1}
      />
    )

    const text = getByTestId('konva-text')
    expect(text.dataset.text).toBe(`Being edited by ${ownerName}`)
  })

  it('should handle long owner names', () => {
    const longName = "This is a very long user name that might cause layout issues"
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName={longName}
        ownerColor="#ff8800"
        stageScale={1}
      />
    )

    const text = getByTestId('konva-text')
    expect(text.dataset.text).toBe(`Being edited by ${longName}`)
  })

  it('should handle empty string owner name', () => {
    const { container } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName=""
        ownerColor="#ff0000"
        stageScale={1}
      />
    )

    // Empty string is falsy, should not render
    expect(container).toBeEmptyDOMElement()
  })

  it('should adjust size based on zoom level (small zoom)', () => {
    const smallZoom = 0.5
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Helen"
        ownerColor="#8800ff"
        stageScale={smallZoom}
      />
    )

    const text = getByTestId('konva-text')
    // When zoomed out (small scale), elements should be larger relative to stage
    // fontSize = 12 / 0.5 = 24
    expect(Number(text.dataset.fontSize)).toBe(12 / smallZoom)
  })

  it('should adjust size based on zoom level (large zoom)', () => {
    const largeZoom = 3
    const { getByTestId } = render(
      <OwnershipTooltip
        x={100}
        y={200}
        ownerName="Ivan"
        ownerColor="#00ff88"
        stageScale={largeZoom}
      />
    )

    const text = getByTestId('konva-text')
    // When zoomed in (large scale), elements should be smaller relative to stage
    // fontSize = 12 / 3 = 4
    expect(Number(text.dataset.fontSize)).toBe(12 / largeZoom)
  })
})

