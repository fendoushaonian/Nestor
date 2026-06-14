import { config as loadEnv } from 'dotenv';
import { join } from 'path';

/**
 * 在任何模块被加载前先把 .env 读进 process.env。
 * 这样 AppModule 的 imports 在求值阶段 (如 MongoModule.forRoot 读取
 * MONGO_ENABLED) 就能拿到 .env 里的值。必须在 main.ts 最顶部第一行导入。
 * 兼容从仓库根目录或 apps/api 目录启动两种情况。
 */
loadEnv({ path: join(process.cwd(), '.env') });
loadEnv({ path: join(process.cwd(), '..', '..', '.env') });
