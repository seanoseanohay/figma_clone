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
    
    // Selected tool (Pan) should have blue background
    expect(panButton).toHaveStyle({ backgroundColor: '#2563eb' })
    // Unselected tool (Select) should have white background
    expect(selectButton).toHaveStyle({ backgroundColor: '#ffffff' })
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
    
    let selectButton = screen.getByTitle('Select Tool (Press V)')
    let panButton = screen.getByTitle('Pan Tool (Hold Space)')
    
    // Initially Select is selected
    expect(selectButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(panButton).toHaveStyle({ backgroundColor: '#ffffff' })
    
    // Re-render with Pan selected
    rerender(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.PAN} />)
    
    selectButton = screen.getByTitle('Select Tool (Press V)')
    panButton = screen.getByTitle('Pan Tool (Hold Space)')
    
    // Now Pan is selected
    expect(panButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(selectButton).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('has correct default selected tool', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} />)
    
    const panButton = screen.getByTitle('Pan Tool (Hold Space)')
    expect(panButton).toHaveStyle({ backgroundColor: '#2563eb' })
  })
})
