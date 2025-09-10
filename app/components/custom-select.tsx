'use client'

import { useState, useRef, useEffect } from 'react'

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option',
  disabled = false,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div 
      ref={dropdownRef}
      className={`custom-select ${className}`}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          paddingRight: '40px',
          border: '2px solid #E5E7EB',
          borderRadius: '8px',
          fontSize: '16px',
          textAlign: 'left',
          background: disabled ? '#F9FAFB' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          outline: 'none',
          color: selectedOption ? '#111827' : '#6B7280'
        }}
      >
        {selectedOption ? selectedOption.label : placeholder}
        <svg 
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : ''}`,
            transition: 'transform 0.2s',
            width: '20px',
            height: '20px'
          }}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={disabled ? '#9CA3AF' : '#6B7280'}
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div 
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'white',
            border: '2px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="custom-select-option"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                background: value === option.value ? '#EBF5FF' : 'transparent',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                color: value === option.value ? '#2563EB' : '#111827',
                fontWeight: value === option.value ? '600' : '400'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = '#F9FAFB'
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}