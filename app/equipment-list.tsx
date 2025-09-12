'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icons, iconSizes } from '@/lib/icons'

export default function EquipmentList({ equipment }: { equipment: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter equipment based on search term (Task ID or Serial Number)
  const filteredEquipment = equipment.filter(item => {
    const search = searchTerm.toLowerCase()
    return (
      item.serial.toLowerCase().includes(search) ||
      item.model.toLowerCase().includes(search) ||
      (item.inProgressInspection?.taskId && item.inProgressInspection.taskId.toLowerCase().includes(search))
    )
  })

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by Serial Number, Model, or Task ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
          <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredEquipment.length} result{filteredEquipment.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="equipment-grid">
        {filteredEquipment.map(item => (
          <div key={item.id} className="card flex flex-col h-full">
            <div className="flex-1 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {item.model}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {item.type.replace('_', ' ')} • {item.serial}
                  </p>
                  {item.inProgressInspection?.taskId && (
                    <p className="text-xs text-blue-600 mt-1">
                      Task ID: {item.inProgressInspection.taskId}
                    </p>
                  )}
                </div>
                <span className={`status-badge ${
                  item.status === 'OPERATIONAL' ? 'status-operational' :
                  item.status === 'MAINTENANCE' ? 'status-maintenance' :
                  item.status === 'OUT_OF_SERVICE' ? 'status-out_of_service' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.location className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{item.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Icons.timer className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{item.hoursUsed} hours</span>
                </div>
                {item.hasInProgressInspection ? (
                  <div className="flex items-center gap-2 text-amber-500">
                    <Icons.warning className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">Inspection in progress</span>
                  </div>
                ) : item.lastCompletedInspection && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Icons.checkCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">Last: {new Date(item.lastCompletedInspection.completedAt || item.lastCompletedInspection.startedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {item.hasInProgressInspection ? (
              <Link href={`/inspect/${item.id}`} className="no-underline">
                <button className="btn btn-warning w-full">
                  Resume Inspection
                </button>
              </Link>
            ) : (
              <Link href={`/inspect/${item.id}/select-template`} className="no-underline">
                <button className="btn btn-primary w-full">
                  Start Inspection
                </button>
              </Link>
            )}
          </div>
        ))}
        
        {/* Add Equipment Card */}
        <Link href="/equipment/new" className="no-underline">
          <div className="card flex flex-col items-center justify-center min-h-[240px] cursor-pointer border-3 border-dashed border-blue-400 hover:border-blue-500 transition-all h-full">
            <Icons.add className="w-16 h-16 text-blue-400 mb-3" />
            <span className="text-lg font-semibold text-gray-700">Add Equipment</span>
          </div>
        </Link>
      </div>

      {filteredEquipment.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <Icons.search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No equipment found matching "{searchTerm}"</p>
        </div>
      )}
    </>
  )
}