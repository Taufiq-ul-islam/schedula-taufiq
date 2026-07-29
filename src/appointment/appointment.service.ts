import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { Patient } from '../patient/patient.entity';
import { Doctor } from '../doctor/doctor.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
  ) {}

  async getMyAppointments(userId: number) {
    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const appointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .where('a.patientId = :patientId', { patientId: patient.id })
      .orderBy('a.apptDate', 'DESC')
      .getMany();

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found');
    }
    return appointments;
  }

  async getDoctorAppointments(userId: number) {
    const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id })
      .orderBy('a.apptDate', 'DESC')
      .getMany();

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found');
    }
    return appointments;
  }

  async cancelAppointment(userId: number, appointmentId: number) {
    const patient = await this.patientRepo.findOne({ where: { user: { id: userId }, relation: 'Self' } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.patient.id !== patient.id) {
      throw new ForbiddenException('You are not the owner of this appointment');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    const apptDateTime = new Date(`${appointment.apptDate}T${appointment.startTime}:00`);
    if (apptDateTime.getTime() < Date.now()) {
      throw new BadRequestException('Cannot cancel a past appointment');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    return this.appointmentRepo.save(appointment);
  }
}
