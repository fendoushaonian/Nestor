/** access token 载荷 */
export interface JwtPayload {
  /** 用户 id */
  sub: string;
  username: string;
  /** 角色编码列表, 如 ['admin'] */
  roles: string[];
  /** 权限编码列表, 如 ['card:create'] */
  permissions: string[];
  /** token 唯一 id, 用于登出黑名单 */
  jti: string;
  /** token 类型 */
  type: 'access' | 'refresh';
  /** 过期时间 (秒), 由 jwt 库签发时写入 */
  exp?: number;
}

/** 注入到 request.user 的已认证用户信息 */
export interface AuthUser {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  jti: string;
  /** access token 过期时间 (秒), 用于登出黑名单 TTL */
  exp?: number;
}
