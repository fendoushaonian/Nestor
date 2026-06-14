import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialController } from './credential.controller';
import { CredentialService } from './credential.service';
import { WorkflowEngine } from './engine.service';
import { Credential } from './entities/credential.entity';
import { Execution } from './entities/execution.entity';
import { Workflow } from './entities/workflow.entity';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { NodeRegistry } from './nodes/node-registry';
import { WorkflowScheduleService } from './schedule.service';
import { WebhookController } from './webhook.controller';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

/** iPaaS 工作流模块: 定义/执行引擎/节点/触发器/凭证。 */
@Module({
  imports: [TypeOrmModule.forFeature([Workflow, Execution, Credential]), ScheduleModule.forRoot()],
  controllers: [WorkflowController, ExecutionController, CredentialController, WebhookController],
  providers: [
    WorkflowService,
    ExecutionService,
    CredentialService,
    WorkflowEngine,
    NodeRegistry,
    WorkflowScheduleService,
  ],
  exports: [WorkflowService, ExecutionService],
})
export class WorkflowModule {}
