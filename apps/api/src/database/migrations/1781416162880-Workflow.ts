import { MigrationInterface, QueryRunner } from "typeorm";

export class Workflow1781416162880 implements MigrationInterface {
    name = 'Workflow1781416162880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "credentials" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "type" varchar(64) NOT NULL, "data_encrypted" text NOT NULL, "created_by" varchar)`);
        await queryRunner.query(`CREATE INDEX "IDX_93836d4384e1fb74a290861cf1" ON "credentials" ("type") `);
        await queryRunner.query(`CREATE TABLE "executions" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "workflow_id" varchar NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('running'), "mode" varchar(16) NOT NULL DEFAULT ('manual'), "started_at" datetime, "finished_at" datetime, "error" text, "node_runs" text, "triggered_by" varchar)`);
        await queryRunner.query(`CREATE INDEX "IDX_2a41dc8514e3d4610c6285c397" ON "executions" ("workflow_id") `);
        await queryRunner.query(`CREATE TABLE "workflows" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT (0), "graph" text, "created_by" varchar)`);
        await queryRunner.query(`CREATE INDEX "IDX_bec3b77ab15b4e47615ac326d4" ON "workflows" ("active") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_bec3b77ab15b4e47615ac326d4"`);
        await queryRunner.query(`DROP TABLE "workflows"`);
        await queryRunner.query(`DROP INDEX "IDX_2a41dc8514e3d4610c6285c397"`);
        await queryRunner.query(`DROP TABLE "executions"`);
        await queryRunner.query(`DROP INDEX "IDX_93836d4384e1fb74a290861cf1"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
    }

}
