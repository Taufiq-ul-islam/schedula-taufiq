import { Appointment } from '../appointment.entity';

export function toAppointmentResponse(appointment: Appointment) {
  return {
    id: appointment.id,
    date: appointment.apptDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    schedulingType: appointment.schedulingType,
    tokenNumber: appointment.tokenNumber ?? null,
    status: appointment.status,
    doctor: appointment.doctor
      ? { name: appointment.doctor.name, specialization: appointment.doctor.specialization }
      : undefined,
    patient: appointment.patient
      ? { name: appointment.patient.name, age: appointment.patient.age }
      : undefined,
  };
}
