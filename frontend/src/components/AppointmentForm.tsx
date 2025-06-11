import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Save, X } from 'lucide-react';
import { useLockSystem } from '@/hooks/useLockSystem';
import { LockIndicator } from './LockIndicator';
import { AdminControls } from './AdminControls';
import { FollowingPointer } from './FollowingPointer';

interface AppointmentData {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  patientName: string;
}

export const AppointmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const appointmentId = id || '';
  
  const {
    lockStatus,
    acquireLock,
    releaseLock,
    isAcquiring,
    updateCursor
  } = useLockSystem(appointmentId);

  const [formData, setFormData] = useState<AppointmentData>({
    id: appointmentId,
    title: '',
    description: '',
    date: '',
    time: '',
    patientName: ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingAttempted, setIsEditingAttempted] = useState(false);
  const canEdit = lockStatus?.isOwner || false;
  const userRole = 'user';

  // Auto-acquire lock when user attempts to edit
  const handleInputChange = async (field: keyof AppointmentData, value: string) => {
    // If user doesn't have lock and tries to edit, automatically acquire lock
    if (!canEdit && !isEditingAttempted && !lockStatus?.isLocked) {
      setIsEditingAttempted(true);
      try {
        await acquireLock();
        // After acquiring lock, apply the change
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to acquire lock:', error);
        alert('Cannot edit: ' + (error as Error).message);
        setIsEditingAttempted(false);
        return;
      }
    } else if (canEdit) {
      // User already has lock, proceed with edit
      setFormData(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
    } else if (lockStatus?.isLocked && !lockStatus?.isOwner) {
      // Someone else has the lock
      alert(`Cannot edit: Appointment is being edited by ${lockStatus.lockedBy?.name}`);
      return;
    }
  };

  // Reset editing attempt when lock status changes
  useEffect(() => {
    if (lockStatus?.isOwner) {
      setIsEditingAttempted(false);
    }
  }, [lockStatus?.isOwner]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const coordinates = { x: e.clientX, y: e.clientY };
    console.log('Mouse coordinates:', coordinates, 'canEdit:', canEdit, 'isConnected:', /* get from useWebSocket */);
    
    if (canEdit) {
      updateCursor(coordinates);
    } else {
      console.log('Cannot update cursor - user cannot edit');
    }
  };

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return;
    
    try {
      await appointmentApi.updateAppointment(appointmentId, {
        title: formData.title,
        description: formData.description,
        patientName: formData.patientName,
        // Add other fields as needed
      });
      setHasChanges(false);
      console.log('Appointment saved successfully');
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert('Failed to save appointment. Please try again.');
    }
  };

  const handleAcquireLock = async () => {
    try {
      await acquireLock();
    } catch (error) {
      console.error('Failed to acquire lock:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" onMouseMove={handleMouseMove}>
      <FollowingPointer appointmentId={appointmentId} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Appointment {appointmentId}
          </h1>
          <LockIndicator lockStatus={lockStatus} />
        </div>

        {/* Remove the Start Editing button - auto-acquire on edit attempt */}
        {lockStatus?.isLocked && !lockStatus?.isOwner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              This appointment is currently being edited by {lockStatus.lockedBy?.name}.
              You can view the form but cannot make changes.
            </p>
          </div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          className="space-y-6 bg-white p-6 rounded-lg border"
        >
          {/* Form fields remain the same but now auto-acquire lock on edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name
              </label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => handleInputChange('patientName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter patient name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter appointment title"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={!canEdit}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              placeholder="Enter appointment description or notes"
            />
          </div>
        </motion.div>

        {/* Release Lock Button */}
        {canEdit && (
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={releaseLock}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Stop Editing
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentForm;