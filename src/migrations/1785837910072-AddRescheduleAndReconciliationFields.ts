import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRescheduleAndReconciliationFields1785837910072 implements MigrationInterface {
    name = 'AddRescheduleAndReconciliationFields1785837910072'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" ADD "cancelReason" character varying`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "notificationPending" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "minMinutesPerPatient" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "minMinutesPerPatient"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "notificationPending"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "cancelReason"`);
    }

}
