import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '@/services/api';
import { Appointment } from '@/types/appointment';
import { useLockSystem } from './useLockSystem';

export const useAppointments = (appointmentId: string) => {
  const queryClient = useQueryClient();
  const { lockStatus } = useLockSystem(appointmentId);

  // Query to get appointment data
  const appointmentQuery = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.getAppointment(appointmentId),
  });

  // Mutation to update appointment
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Appointment>) => 
      appointmentApi.updateAppointment(appointmentId, data),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['appointment', appointmentId], updatedData);
    },
    onError: (error: any) => {
      console.error('Failed to update appointment:', error.response?.data?.error);
    },
  });

  const updateAppointment = (data: Partial<Appointment>) => {
    if (!lockStatus.canEdit) {
      console.warn('Cannot edit appointment - no lock or not owner');
      return;
    }
    updateMutation.mutate(data);
  };

  return {
    appointment: appointmentQuery.data,
    isLoading: appointmentQuery.isLoading,
    error: appointmentQuery.error,
    updateAppointment,
    isUpdating: updateMutation.isLoading,
    canEdit: lockStatus.canEdit,
  };
};