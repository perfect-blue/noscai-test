import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { LockStatus, CursorUpdate } from '@/types/appointment';

// User atom
export const currentUserAtom = atom<{
  id: string;
  name: string;
  email: string;
  role: string;
} | null>(null);

// Connection status
export const isConnectedAtom = atom<boolean>(false);

// Lock status per appointment
export const lockAtomFamily = atomFamily((appointmentId: string) =>
  atom<LockStatus | null>(null)
);

// Main lock status atom (for backward compatibility)
export const lockAtom = atom<LockStatus | null>(null);

// Cursor updates atom family (per appointment)
export const cursorsAtomFamily = atomFamily((appointmentId: string) =>
  atom<CursorUpdate[]>([])
);

// Cursors atom (for backward compatibility)
export const cursorsAtom = atom<Record<string, CursorUpdate[]>>({});

// Update cursor atom
export const updateCursorAtom = atom(
  null,
  (get, set, cursorUpdate: CursorUpdate) => {
    const currentCursors = get(cursorsAtomFamily(cursorUpdate.appointmentId));
    const filteredCursors = currentCursors.filter(c => c.userId !== cursorUpdate.userId);
    set(cursorsAtomFamily(cursorUpdate.appointmentId), [...filteredCursors, cursorUpdate]);
    
    // Update the main cursors atom too
    const allCursors = get(cursorsAtom);
    set(cursorsAtom, {
      ...allCursors,
      [cursorUpdate.appointmentId]: [...filteredCursors, cursorUpdate]
    });
  }
);

// Lock update action
export const updateLockAction = atom(
  null,
  (get, set, update: { appointmentId: string; lock: LockStatus | null }) => {
    set(lockAtomFamily(update.appointmentId), update.lock);
    // Update main lock atom if it's the current appointment
    const currentLock = get(lockAtom);
    if (!currentLock || currentLock.appointmentId === update.appointmentId) {
      set(lockAtom, update.lock);
    }
  }
);

// Cursors update action
export const updateCursorsAction = atom(
  null,
  (get, set, update: { appointmentId: string; cursors: CursorUpdate[] }) => {
    set(cursorsAtomFamily(update.appointmentId), update.cursors);
    const allCursors = get(cursorsAtom);
    set(cursorsAtom, {
      ...allCursors,
      [update.appointmentId]: update.cursors
    });
  }
);

// Helper to get cursors for specific appointment
export const getCursorsForAppointment = (appointmentId: string) => 
  cursorsAtomFamily(appointmentId);