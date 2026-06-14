import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1781407320885 implements MigrationInterface {
  name = 'Init1781407320885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "username" varchar(64) NOT NULL, "email" varchar(128), "phone" varchar(32), "password_hash" varchar(255) NOT NULL, "nickname" varchar(64), "avatar_url" varchar(512), "status" varchar(16) NOT NULL DEFAULT ('active'))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(64) NOT NULL, "code" varchar(64) NOT NULL, "description" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f6d54f95c31b73fb1bdd8e91d0" ON "roles" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(64) NOT NULL, "code" varchar(128) NOT NULL, "resource" varchar(64), "action" varchar(32))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8dad765629e83229da6feda1c1" ON "permissions" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "type" varchar(16) NOT NULL DEFAULT ('membership'), "duration_days" integer NOT NULL DEFAULT (0), "quota" integer NOT NULL DEFAULT (0), "description" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_batches" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "product_id" varchar, "total" integer NOT NULL DEFAULT (0), "expire_days" integer NOT NULL DEFAULT (0), "created_by" varchar, "remark" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_redeem_logs" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "card_id" varchar NOT NULL, "user_id" varchar NOT NULL, "ip" varchar(64), "device" varchar(255), "redeemed_at" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5914fd300bf77e79a28c0c135d" ON "card_redeem_logs" ("card_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5be98c833f8f30c5325daa152e" ON "card_redeem_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cards" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "batch_id" varchar NOT NULL, "code" varchar(64) NOT NULL, "secret" varchar(128) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('unused'), "bound_user_id" varchar, "used_at" datetime, "expire_at" datetime)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_af8c1e25df58bc35de84c8e54e" ON "cards" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_entitlements" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar NOT NULL, "product_id" varchar, "source_card_id" varchar, "start_at" datetime, "end_at" datetime, "remaining_quota" integer NOT NULL DEFAULT (0))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a73e33e151f2988cd863aa283d" ON "user_entitlements" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar, "action" varchar(128) NOT NULL, "target" varchar(128), "detail" text, "ip" varchar(64), "user_agent" varchar(512))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "configs" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "config_key" varchar(128) NOT NULL, "config_value" text, "config_group" varchar(64), "description" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9b20ea370a0ae16a96d8190e01" ON "configs" ("config_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "login_logs" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "user_id" varchar, "username" varchar(64), "ip" varchar(64), "user_agent" varchar(512), "success" boolean NOT NULL DEFAULT (0), "message" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e2dffa109d0d3dbd94a0a51669" ON "login_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" varchar NOT NULL, "role_id" varchar NOT NULL, PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" varchar NOT NULL, "permission_id" varchar NOT NULL, PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_card_batches" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "product_id" varchar, "total" integer NOT NULL DEFAULT (0), "expire_days" integer NOT NULL DEFAULT (0), "created_by" varchar, "remark" varchar(255), CONSTRAINT "FK_a8c16e73024eeb65f770cb9b72b" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_card_batches"("id", "created_at", "updated_at", "deleted_at", "name", "product_id", "total", "expire_days", "created_by", "remark") SELECT "id", "created_at", "updated_at", "deleted_at", "name", "product_id", "total", "expire_days", "created_by", "remark" FROM "card_batches"`,
    );
    await queryRunner.query(`DROP TABLE "card_batches"`);
    await queryRunner.query(`ALTER TABLE "temporary_card_batches" RENAME TO "card_batches"`);
    await queryRunner.query(`DROP INDEX "IDX_af8c1e25df58bc35de84c8e54e"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_cards" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "batch_id" varchar NOT NULL, "code" varchar(64) NOT NULL, "secret" varchar(128) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('unused'), "bound_user_id" varchar, "used_at" datetime, "expire_at" datetime, CONSTRAINT "FK_f2c3df0bea7ad86193bf5cd554b" FOREIGN KEY ("batch_id") REFERENCES "card_batches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_cards"("id", "created_at", "updated_at", "deleted_at", "batch_id", "code", "secret", "status", "bound_user_id", "used_at", "expire_at") SELECT "id", "created_at", "updated_at", "deleted_at", "batch_id", "code", "secret", "status", "bound_user_id", "used_at", "expire_at" FROM "cards"`,
    );
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`ALTER TABLE "temporary_cards" RENAME TO "cards"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_af8c1e25df58bc35de84c8e54e" ON "cards" ("code") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
    await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_user_roles" ("user_id" varchar NOT NULL, "role_id" varchar NOT NULL, CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_user_roles"("user_id", "role_id") SELECT "user_id", "role_id" FROM "user_roles"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`ALTER TABLE "temporary_user_roles" RENAME TO "user_roles"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_role_permissions" ("role_id" varchar NOT NULL, "permission_id" varchar NOT NULL, CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_role_permissions"("role_id", "permission_id") SELECT "role_id", "permission_id" FROM "role_permissions"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_role_permissions" RENAME TO "role_permissions"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" RENAME TO "temporary_role_permissions"`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" varchar NOT NULL, "permission_id" varchar NOT NULL, PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions"("role_id", "permission_id") SELECT "role_id", "permission_id" FROM "temporary_role_permissions"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_role_permissions"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
    await queryRunner.query(`ALTER TABLE "user_roles" RENAME TO "temporary_user_roles"`);
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" varchar NOT NULL, "role_id" varchar NOT NULL, PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "user_roles"("user_id", "role_id") SELECT "user_id", "role_id" FROM "temporary_user_roles"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_user_roles"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_af8c1e25df58bc35de84c8e54e"`);
    await queryRunner.query(`ALTER TABLE "cards" RENAME TO "temporary_cards"`);
    await queryRunner.query(
      `CREATE TABLE "cards" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "batch_id" varchar NOT NULL, "code" varchar(64) NOT NULL, "secret" varchar(128) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('unused'), "bound_user_id" varchar, "used_at" datetime, "expire_at" datetime)`,
    );
    await queryRunner.query(
      `INSERT INTO "cards"("id", "created_at", "updated_at", "deleted_at", "batch_id", "code", "secret", "status", "bound_user_id", "used_at", "expire_at") SELECT "id", "created_at", "updated_at", "deleted_at", "batch_id", "code", "secret", "status", "bound_user_id", "used_at", "expire_at" FROM "temporary_cards"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_cards"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_af8c1e25df58bc35de84c8e54e" ON "cards" ("code") `,
    );
    await queryRunner.query(`ALTER TABLE "card_batches" RENAME TO "temporary_card_batches"`);
    await queryRunner.query(
      `CREATE TABLE "card_batches" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "name" varchar(128) NOT NULL, "product_id" varchar, "total" integer NOT NULL DEFAULT (0), "expire_days" integer NOT NULL DEFAULT (0), "created_by" varchar, "remark" varchar(255))`,
    );
    await queryRunner.query(
      `INSERT INTO "card_batches"("id", "created_at", "updated_at", "deleted_at", "name", "product_id", "total", "expire_days", "created_by", "remark") SELECT "id", "created_at", "updated_at", "deleted_at", "name", "product_id", "total", "expire_days", "created_by", "remark" FROM "temporary_card_batches"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_card_batches"`);
    await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "IDX_e2dffa109d0d3dbd94a0a51669"`);
    await queryRunner.query(`DROP TABLE "login_logs"`);
    await queryRunner.query(`DROP INDEX "IDX_9b20ea370a0ae16a96d8190e01"`);
    await queryRunner.query(`DROP TABLE "configs"`);
    await queryRunner.query(`DROP INDEX "IDX_bd2726fd31b35443f2245b93ba"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "IDX_a73e33e151f2988cd863aa283d"`);
    await queryRunner.query(`DROP TABLE "user_entitlements"`);
    await queryRunner.query(`DROP INDEX "IDX_af8c1e25df58bc35de84c8e54e"`);
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP INDEX "IDX_5be98c833f8f30c5325daa152e"`);
    await queryRunner.query(`DROP INDEX "IDX_5914fd300bf77e79a28c0c135d"`);
    await queryRunner.query(`DROP TABLE "card_redeem_logs"`);
    await queryRunner.query(`DROP TABLE "card_batches"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "IDX_8dad765629e83229da6feda1c1"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP INDEX "IDX_f6d54f95c31b73fb1bdd8e91d0"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "IDX_a000cca60bcf04454e72769949"`);
    await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP INDEX "IDX_fe0bb3f6520ee0469504521e71"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
