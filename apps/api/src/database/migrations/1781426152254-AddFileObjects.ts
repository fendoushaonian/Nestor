import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileObjects1781426152254 implements MigrationInterface {
  name = 'AddFileObjects1781426152254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "file_objects" ("id" varchar PRIMARY KEY NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "deleted_at" datetime, "key" varchar(512) NOT NULL, "driver" varchar(16) NOT NULL, "original_name" varchar(255) NOT NULL, "mime_type" varchar(128) NOT NULL, "size" bigint NOT NULL, "url" varchar(1024) NOT NULL, "uploader_id" varchar)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97640b965787cbd8503f609b8a" ON "file_objects" ("key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4fbb41370ea792e9249a3a05b" ON "file_objects" ("uploader_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_f4fbb41370ea792e9249a3a05b"`);
    await queryRunner.query(`DROP INDEX "IDX_97640b965787cbd8503f609b8a"`);
    await queryRunner.query(`DROP TABLE "file_objects"`);
  }
}
