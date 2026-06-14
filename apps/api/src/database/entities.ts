import { Permission } from '../modules/auth/entities/permission.entity';
import { Role } from '../modules/auth/entities/role.entity';
import { User } from '../modules/auth/entities/user.entity';
import { UserIdentity } from '../modules/auth/entities/user-identity.entity';
import { CardBatch } from '../modules/card/entities/card-batch.entity';
import { CardRedeemLog } from '../modules/card/entities/card-redeem-log.entity';
import { Card } from '../modules/card/entities/card.entity';
import { Product } from '../modules/card/entities/product.entity';
import { UserEntitlement } from '../modules/card/entities/user-entitlement.entity';
import { AuditLog } from '../modules/system/entities/audit-log.entity';
import { FileObject } from '../modules/upload/entities/file-object.entity';
import { Config } from '../modules/system/entities/config.entity';
import { LoginLog } from '../modules/system/entities/login-log.entity';
import { Credential } from '../modules/workflow/entities/credential.entity';
import { Execution } from '../modules/workflow/entities/execution.entity';
import { Workflow } from '../modules/workflow/entities/workflow.entity';

/** 所有实体集中注册, 供 TypeOrmModule 与 migration 数据源共用。 */
export const entities = [
  User,
  UserIdentity,
  Role,
  Permission,
  Product,
  CardBatch,
  Card,
  CardRedeemLog,
  UserEntitlement,
  AuditLog,
  LoginLog,
  Config,
  FileObject,
  Workflow,
  Execution,
  Credential,
];
