import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSchedulingSystem1784891847483 implements MigrationInterface {
    name = 'AddSchedulingSystem1784891847483'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_b463fce395ead7791607a5c33eb"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "slotId"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "apptDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "startTime" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "endTime" TIME NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."appointment_schedulingtype_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "schedulingType" "public"."appointment_schedulingtype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "tokenNumber" integer`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_schedulingtype_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "schedulingType" "public"."doctor_schedulingtype_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "slotDurationMinutes" integer`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "bufferMinutes" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "maxCapacityPerWindow" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "status" SET DEFAULT 'upcoming'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "maxCapacityPerWindow"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "bufferMinutes"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "slotDurationMinutes"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "schedulingType"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_schedulingtype_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "tokenNumber"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "schedulingType"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_schedulingtype_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "apptDate"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "slotId" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_b463fce395ead7791607a5c33eb" FOREIGN KEY ("slotId") REFERENCES "slot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
