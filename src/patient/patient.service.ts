import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { User } from '../user/user.entity';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createProfile(userId: number, dto: CreatePatientProfileDto) {
    const existing = await this.patientRepo.findOne({
      where: { user: { id: userId }, relation: 'Self' },
    });
    if (existing) {
      throw new ConflictException('Patient profile already exists for this user');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patient = this.patientRepo.create({
      ...dto,
      phone: dto.phone || user.mobileNumber,
      relation: 'Self',
      user: { id: userId } as any,
    });
    return this.patientRepo.save(patient);
  }

  async getProfile(userId: number) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId }, relation: 'Self' },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    return patient;
  }

  async updateProfile(userId: number, dto: UpdatePatientProfileDto) {
    const patient = await this.getProfile(userId);
    Object.assign(patient, dto);
    return this.patientRepo.save(patient);
  }
}
