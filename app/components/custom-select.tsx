'use client'

import { useState, useRef, useEffect } from 'react'
import { Icons, iconSizes } from '@/lib/icons'

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
      className={`relative ${className}`}
    >
      <button
        type="button"
        className={`
          w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg text-base text-left
          transition-all duration-200 outline-none relative
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}
          ${selectedOption ? 'text-gray-900' : 'text-gray-500'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedOption ? selectedOption.label : placeholder}
        <Icons.chevronDown 
          className={`
            absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
            ${disabled ? 'text-gray-400' : 'text-gray-600'}
          `}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto animate-in fade-in-10 slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                w-full px-4 py-3 text-left text-base transition-all duration-150
                hover:bg-gray-50 hover:pl-5
                ${value === option.value 
                  ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-500' 
                  : 'text-gray-900 hover:text-gray-700'
                }
              `}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {value === option.value && (
                  <Icons.check className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}