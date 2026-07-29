import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentStatusEnum1785222812635 implements MigrationInterface {
    name = 'AddAppointmentStatusEnum1785222812635'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."appointment_status_enum" AS ENUM('BOOKED', 'CANCELLED')`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "status" "public"."appointment_status_enum" NOT NULL DEFAULT 'BOOKED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_status_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "status" character varying NOT NULL DEFAULT 'upcoming'`);
    }

}
