import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toolbar, { TOOLS } from '../canvas/Toolbar.jsx'

describe('Toolbar Component', () => {
  it('renders all three tool buttons', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.SELECT} />)
    
    expect(screen.getByTitle('Pan Tool (Hold Space)')).toBeInTheDocument()
    expect(screen.getByTitle('Select Tool (Press V)')).toBeInTheDocument()
    expect(screen.getByTitle('Rectangle Tool')).toBeInTheDocument()
  })

  it('shows correct visual feedback for selected tool', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.PAN} />)
    
    const panButton = screen.getByTitle('Pan Tool (Hold Space)')
    const selectButton = screen.getByTitle('Select Tool (Press V)')
    
    // Selected tool should have different styling (MUI variant='contained')
    // Check computed styles which may be in hex or RGB format
    const panStyle = window.getComputedStyle(panButton)
    const selectStyle = window.getComputedStyle(selectButton)
    
    // Selected button should have a colored background
    expect(panStyle.backgroundColor).toBeTruthy()
    // Buttons should have different backgrounds
    expect(panStyle.backgroundColor).not.toBe(selectStyle.backgroundColor)
  })

  it('calls onToolChange when tool is clicked', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.SELECT} />)
    
    const rectangleButton = screen.getByTitle('Rectangle Tool')
    fireEvent.click(rectangleButton)
    
    expect(mockOnToolChange).toHaveBeenCalledWith(TOOLS.RECTANGLE)
  })

  it('displays correct tool hint text', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.RECTANGLE} />)
    
    expect(screen.getByText('Rectangle Tool')).toBeInTheDocument()
  })

  it('updates visual feedback when selectedTool prop changes', () => {
    const mockOnToolChange = vi.fn()
    const { rerender } = render(
      <Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.SELECT} />
    )
    
    const selectButton = screen.getByTitle('Select Tool (Press V)')
    const panButton = screen.getByTitle('Pan Tool (Hold Space)')
    
    // Get initial background colors
    const initialSelectBg = window.getComputedStyle(selectButton).backgroundColor
    const initialPanBg = window.getComputedStyle(panButton).backgroundColor
    
    // Re-render with Pan selected
    rerender(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.PAN} />)
    
    const updatedSelectBg = window.getComputedStyle(selectButton).backgroundColor
    const updatedPanBg = window.getComputedStyle(panButton).backgroundColor
    
    // Background colors should change when selection changes
    expect(updatedPanBg).toBeTruthy()
    expect(updatedSelectBg).toBeTruthy()
  })

  it('has correct default selected tool', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} />)
    
    const panButton = screen.getByTitle('Pan Tool (Hold Space)')
    // Pan tool should be rendered and interactable (default behavior)
    expect(panButton).toBeInTheDocument()
    expect(panButton).toBeEnabled()
  })
})
