import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import configuration from '../config/configuration';
import { buildTypeOrmOptions } from './typeorm-options';

// 从仓库根目录的 .env 读取配置 (供 `pnpm migration:*` 命令使用)
loadEnv({ path: join(__dirname, '..', '..', '..', '..', '.env') });

const { database } = configuration();

// migration 源码 glob (ts-node 运行)
const migrationsGlob = join(__dirname, 'migrations', '*.ts');

export default new DataSource(buildTypeOrmOptions(database, migrationsGlob));
