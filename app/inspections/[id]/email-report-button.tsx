'use client'

import { useState } from 'react'
import { Icons } from '@/lib/icons'

interface EmailReportButtonProps {
  inspectionId: string
}

export default function EmailReportButton({ inspectionId }: EmailReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleSendEmail = async () => {
    if (!email.trim()) {
      setMessage('Please enter an email address')
      setMessageType('error')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMessage('Please enter a valid email address')
      setMessageType('error')
      return
    }

    setIsSending(true)
    setMessage('')

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Report sent successfully!')
        setMessageType('success')
        setTimeout(() => {
          setIsModalOpen(false)
          setEmail('')
          setMessage('')
          setMessageType('')
        }, 2000)
      } else {
        setMessage(result.error || 'Failed to send email')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setMessage('Failed to send email')
      setMessageType('error')
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEmail('')
    setMessage('')
    setMessageType('')
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn btn-secondary flex items-center gap-2"
      >
        <Icons.mail className="w-4 h-4" />
        Email Report
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content p-6 max-w-md">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Icons.mail className="w-5 h-5 text-teal-600" />
                Email Inspection Report
              </h2>
              <p className="text-sm text-gray-600">
                Enter the email address to send the PDF report to:
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-0 transition-colors"
                placeholder="recipient@example.com"
                disabled={isSending}
                autoFocus
              />
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
                messageType === 'success' 
                  ? 'bg-green-50 text-green-800 border-2 border-green-200' 
                  : 'bg-red-50 text-red-800 border-2 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {messageType === 'success' ? (
                    <Icons.checkCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Icons.alert className="w-4 h-4 text-red-600" />
                  )}
                  {message}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary flex-1 py-3"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                disabled={isSending || !email.trim()}
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Icons.mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
