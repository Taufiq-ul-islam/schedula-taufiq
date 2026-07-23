import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
  ) {}

  async createProfile(userId: number, dto: CreateDoctorProfileDto) {
    const existing = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (existing) {
      throw new ConflictException('Doctor profile already exists for this user');
    }

    const doctor = this.doctorRepo.create({ ...dto, user: { id: userId } as any });
    return this.doctorRepo.save(doctor);
  }

  async getProfile(userId: number) {
    const doctor = await this.doctorRepo.findOne({ where: { user: { id: userId } } });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    return doctor;
  }

  async updateProfile(userId: number, dto: UpdateDoctorProfileDto) {
    const doctor = await this.getProfile(userId); // reuses not-found check
    Object.assign(doctor, dto);
    return this.doctorRepo.save(doctor);
  }
}
