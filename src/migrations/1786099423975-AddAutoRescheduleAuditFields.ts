import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAutoRescheduleAuditFields1786099423975 implements MigrationInterface {
    name = 'AddAutoRescheduleAuditFields1786099423975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" ADD "originalApptDate" date`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "originalStartTime" TIME`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "originalEndTime" TIME`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "originalTokenNumber" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "autoRescheduled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "autoRescheduled"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "originalTokenNumber"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "originalEndTime"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "originalStartTime"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "originalApptDate"`);
    }

}
