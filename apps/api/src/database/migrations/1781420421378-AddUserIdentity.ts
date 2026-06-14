import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdentity1781420421378 implements MigrationInterface {
  name = 'AddUserIdentity1781420421378';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_identities" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar NOT NULL, "provider" varchar(32) NOT NULL, "provider_user_id" varchar(191) NOT NULL, "union_id" varchar(191), "raw" text)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf5fe01eb8cad7114b4c371cdc" ON "user_identities" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_identity_provider_user" ON "user_identities" ("provider", "provider_user_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_bf5fe01eb8cad7114b4c371cdc"`);
    await queryRunner.query(`DROP INDEX "uq_identity_provider_user"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_user_identities" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar NOT NULL, "provider" varchar(32) NOT NULL, "provider_user_id" varchar(191) NOT NULL, "union_id" varchar(191), "raw" text, CONSTRAINT "FK_bf5fe01eb8cad7114b4c371cdc7" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_user_identities"("id", "created_at", "updated_at", "deleted_at", "user_id", "provider", "provider_user_id", "union_id", "raw") SELECT "id", "created_at", "updated_at", "deleted_at", "user_id", "provider", "provider_user_id", "union_id", "raw" FROM "user_identities"`,
    );
    await queryRunner.query(`DROP TABLE "user_identities"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_identities" RENAME TO "user_identities"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bf5fe01eb8cad7114b4c371cdc" ON "user_identities" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_identity_provider_user" ON "user_identities" ("provider", "provider_user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_identity_provider_user"`);
    await queryRunner.query(`DROP INDEX "IDX_bf5fe01eb8cad7114b4c371cdc"`);
    await queryRunner.query(`ALTER TABLE "user_identities" RENAME TO "temporary_user_identities"`);
    await queryRunner.query(
      `CREATE TABLE "user_identities" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar NOT NULL, "provider" varchar(32) NOT NULL, "provider_user_id" varchar(191) NOT NULL, "union_id" varchar(191), "raw" text)`,
    );
    await queryRunner.query(
      `INSERT INTO "user_identities"("id", "created_at", "updated_at", "deleted_at", "user_id", "provider", "provider_user_id", "union_id", "raw") SELECT "id", "created_at", "updated_at", "deleted_at", "user_id", "provider", "provider_user_id", "union_id", "raw" FROM "temporary_user_identities"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_user_identities"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_identity_provider_user" ON "user_identities" ("provider", "provider_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf5fe01eb8cad7114b4c371cdc" ON "user_identities" ("user_id") `,
    );
    await queryRunner.query(`DROP INDEX "uq_identity_provider_user"`);
    await queryRunner.query(`DROP INDEX "IDX_bf5fe01eb8cad7114b4c371cdc"`);
    await queryRunner.query(`DROP TABLE "user_identities"`);
  }
}
