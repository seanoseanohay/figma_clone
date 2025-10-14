import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toolbar, { TOOLS } from '../canvas/Toolbar.jsx'

describe('Toolbar Component', () => {
  it('renders all three tool buttons', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.ARROW} />)
    
    expect(screen.getByTitle('Hand Tool (Pan)')).toBeInTheDocument()
    expect(screen.getByTitle('Arrow Tool (Select)')).toBeInTheDocument()
    expect(screen.getByTitle('Rectangle Tool')).toBeInTheDocument()
  })

  it('shows correct visual feedback for selected tool', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.HAND} />)
    
    const handButton = screen.getByTitle('Hand Tool (Pan)')
    const arrowButton = screen.getByTitle('Arrow Tool (Select)')
    
    // Selected tool (Hand) should have blue background
    expect(handButton).toHaveStyle({ backgroundColor: '#2563eb' })
    // Unselected tool (Arrow) should have white background
    expect(arrowButton).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('calls onToolChange when tool is clicked', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.ARROW} />)
    
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
      <Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.ARROW} />
    )
    
    let arrowButton = screen.getByTitle('Arrow Tool (Select)')
    let handButton = screen.getByTitle('Hand Tool (Pan)')
    
    // Initially Arrow is selected
    expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(handButton).toHaveStyle({ backgroundColor: '#ffffff' })
    
    // Re-render with Hand selected
    rerender(<Toolbar onToolChange={mockOnToolChange} selectedTool={TOOLS.HAND} />)
    
    arrowButton = screen.getByTitle('Arrow Tool (Select)')
    handButton = screen.getByTitle('Hand Tool (Pan)')
    
    // Now Hand is selected
    expect(handButton).toHaveStyle({ backgroundColor: '#2563eb' })
    expect(arrowButton).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('has correct default selected tool', () => {
    const mockOnToolChange = vi.fn()
    render(<Toolbar onToolChange={mockOnToolChange} />)
    
    const arrowButton = screen.getByTitle('Arrow Tool (Select)')
    expect(arrowButton).toHaveStyle({ backgroundColor: '#2563eb' })
  })
})
