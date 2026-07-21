import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Patient } from '../patient/patient.entity';
import { Doctor } from '../doctor/doctor.entity';

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  mobileNumber!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role!: UserRole;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => Patient, (patient) => patient.user)
  patients!: Patient[];

  @OneToOne(() => Doctor, (doctor) => doctor.user, { nullable: true })
  doctorProfile!: Doctor;
}
