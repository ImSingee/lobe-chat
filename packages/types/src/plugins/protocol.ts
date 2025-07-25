/**
 * 协议来源类型
 */
export enum ProtocolSource {
  /** 社区贡献 */
  COMMUNITY = 'community',
  /** 开发者自定义 */
  DEVELOPER = 'developer',
  /** GitHub 官方 */
  GITHUB_OFFICIAL = 'github_official',
  /** 官方LobeHub市场 */
  OFFICIAL = 'official',
  /** 第三方市场 */
  THIRD_PARTY = 'third_party',
}

/**
 * MCP Schema - stdio 配置类型
 */
export interface McpStdioConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * MCP Schema - http 配置类型
 */
export interface McpHttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

/**
 * MCP Schema 配置类型
 */
export type McpConfig = McpStdioConfig | McpHttpConfig;

/**
 * MCP Schema 对象
 * 符合 RFC 0001 定义
 */
export interface McpSchema {
  /** 插件唯一标识符，必须与URL中的id参数匹配 */
  identifier: string;
  /** 插件名称 */
  name: string;
  /** 插件作者 */
  author: string;
  /** 插件描述 */
  description: string;
  /** 插件主页 */
  homepage?: string;
  /** 插件版本 (semver) */
  version: string;
  /** 插件配置 */
  config: McpConfig;
}

/**
 * RFC 0001 协议参数
 * lobehub://plugin/install?type=mcp&id=xxx&schema=xxx&marketId=xxx&meta_*=xxx
 */
export interface McpInstallProtocolParamsRFC {
  /** 插件类型，对于 MCP 固定为 'mcp' */
  type: 'mcp';
  /** 插件的唯一标识符 */
  id: string;
  /** Base64URL 编码的 MCP Schema 对象 */
  schema: string;
  /** 提供该插件的 Marketplace 的唯一标识符 */
  marketId?: string;
  /** 可选的 UI 显示元数据，以 meta_ 为前缀 */
  [key: `meta_${string}`]: string | undefined;
}

/**
 * 协议URL解析结果
 */
export interface ProtocolUrlParsed {
  /** URL类型 (如: 'plugin') */
  urlType: string;
  /** 操作类型 (如: 'install') */
  action: 'install' | 'configure' | 'update';
  /** 插件类型 (如: 'mcp') */
  type: 'mcp' | 'plugin';
  /** 解析后的参数 */
  params: {
    id: string;
    type: string;
    marketId?: string;
    metaParams: Record<string, string>;
  };
  /** MCP Schema 对象 */
  schema: McpSchema;
  /** 协议来源 */
  source: ProtocolSource;
}

/**
 * 安装确认弹窗信息
 */
export interface InstallConfirmationInfo {
  dependencies?: string[];
  permissions?: {
    filesystem?: boolean;
    network?: boolean;
    system?: boolean;
  };
  pluginInfo: {
    author?: string;
    description: string;
    homepage?: string;
    icon?: string;
    identifier: string;
    name: string;
    version: string;
  };
  source: {
    platform?: {
      name: string;
      url?: string;
    };
    type: ProtocolSource;
    verified: boolean; // 是否为验证来源
  };
}

/**
 * 协议处理器接口
 */
export interface ProtocolHandler {
  /**
   * 处理协议URL
   */
  handle(
    parsed: ProtocolUrlParsed,
  ): Promise<{ error?: string; success: boolean; targetWindow?: string }>;

  /**
   * 支持的操作
   */
  readonly supportedActions: string[];

  /**
   * 协议类型
   */
  readonly type: string;
}

/**
 * 协议路由配置
 */
export interface ProtocolRouteConfig {
  /** 操作类型 */
  action: string;
  /** 目标路径（相对于窗口base路径） */
  targetPath?: string;
  /** 目标窗口 */
  targetWindow: 'chat' | 'settings';
  /** 协议类型 */
  type: string;
}
