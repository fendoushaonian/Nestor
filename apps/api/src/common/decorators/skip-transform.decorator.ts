import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM = 'skipTransform';

/**
 * 标记某个路由跳过统一响应包装, 直接返回原始结果。
 * 用于需要保持标准格式的端点 (如 Terminus 健康检查, 供 k8s/LB 探针消费)。
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);
