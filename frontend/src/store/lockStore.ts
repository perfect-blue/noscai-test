import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { LockStatus, CursorUpdate } from '@/types/appointment';

// Main lock status atom
export const lockAtom = atom<LockStatus | null>(null);

// Cursor updates atom family (per appointment)
export const cursorsAtomFamily = atomFamily((appointmentId: string) =>
  atom<CursorUpdate[]>([])
);

// Update cursor atom
export const updateCursorAtom = atom(
  null,
  (get, set, cursorUpdate: CursorUpdate) => {
    const currentCursors = get(cursorsAtomFamily(cursorUpdate.appointmentId));
    const filteredCursors = currentCursors.filter(c => c.userId !== cursorUpdate.userId);
    set(cursorsAtomFamily(cursorUpdate.appointmentId), [...filteredCursors, cursorUpdate]);
  }
);

// Helper to get cursors for specific appointment
export const getCursorsForAppointment = (appointmentId: string) => 
  cursorsAtomFamily(appointmentId);