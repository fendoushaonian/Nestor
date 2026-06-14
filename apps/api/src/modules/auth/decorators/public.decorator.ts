import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** 标记接口无需登录即可访问 (全局 JwtAuthGuard 会放行)。 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
