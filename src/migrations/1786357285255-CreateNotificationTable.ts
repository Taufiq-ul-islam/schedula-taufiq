import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationTable1786357285255 implements MigrationInterface {
    name = 'CreateNotificationTable1786357285255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('APPOINTMENT_BOOKED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "patientId" integer, "appointmentId" integer, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8f3caccaeffc99b2438bbbf132" ON "notifications"  ("patientId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_f04ea6f5b506c1b24903ed4c965" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_a1a62bb5c29d64d2817bb9f7898" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_a1a62bb5c29d64d2817bb9f7898"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_f04ea6f5b506c1b24903ed4c965"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f3caccaeffc99b2438bbbf132"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
