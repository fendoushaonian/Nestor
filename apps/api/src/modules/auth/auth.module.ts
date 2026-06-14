import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginLog } from '../system/entities/login-log.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { UserIdentity } from './entities/user-identity.entity';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthProvidersRegistry } from './oauth/oauth-providers.registry';
import { OAuthService } from './oauth/oauth.service';
import { SeedService } from './seed.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, LoginLog, UserIdentity]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    SeedService,
    OAuthService,
    OAuthProvidersRegistry,
  ],
  exports: [TokenService],
})
export class AuthModule {}
