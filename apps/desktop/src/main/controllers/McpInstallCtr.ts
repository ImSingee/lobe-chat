import { createLogger } from '@/utils/logger';

import { ControllerModule, createProtocolHandler } from '.';
import { McpSchema, ProtocolSource } from '../types/protocol';

const logger = createLogger('controllers:McpInstallCtr');

const protocolHandler = createProtocolHandler('plugin');

/**
 * 验证 MCP Schema 对象结构
 */
function validateMcpSchema(schema: any): schema is McpSchema {
  if (!schema || typeof schema !== 'object') return false;

  // 必填字段验证
  if (typeof schema.identifier !== 'string' || !schema.identifier) return false;
  if (typeof schema.name !== 'string' || !schema.name) return false;
  if (typeof schema.author !== 'string' || !schema.author) return false;
  if (typeof schema.description !== 'string' || !schema.description) return false;
  if (typeof schema.version !== 'string' || !schema.version) return false;

  // 可选字段验证
  if (schema.homepage !== undefined && typeof schema.homepage !== 'string') return false;

  // config 字段验证
  if (!schema.config || typeof schema.config !== 'object') return false;
  const config = schema.config;

  if (config.type === 'stdio') {
    if (typeof config.command !== 'string' || !config.command) return false;
    if (config.args !== undefined && !Array.isArray(config.args)) return false;
    if (config.env !== undefined && typeof config.env !== 'object') return false;
  } else if (config.type === 'http') {
    if (typeof config.url !== 'string' || !config.url) return false;
    try {
      new URL(config.url); // 验证URL格式
    } catch {
      return false;
    }
    if (config.headers !== undefined && typeof config.headers !== 'object') return false;
  } else {
    return false; // 未知的 config type
  }

  return true;
}

/**
 * 将 marketId 映射到 ProtocolSource
 */
function mapMarketIdToSource(marketId?: string): ProtocolSource {
  if (!marketId) return ProtocolSource.THIRD_PARTY;

  const marketSourceMap: Record<string, ProtocolSource> = {
    higress: ProtocolSource.THIRD_PARTY,
    lobehub: ProtocolSource.OFFICIAL,
    smithery: ProtocolSource.THIRD_PARTY,
  };

  return marketSourceMap[marketId.toLowerCase()] || ProtocolSource.THIRD_PARTY;
}

interface McpInstallParams {
  id: string;
  marketId?: string;
  schema?: any;
  type: string;
}

/**
 * MCP 插件安装控制器
 * 负责处理 MCP 插件安装流程
 */
export default class McpInstallController extends ControllerModule {
  /**
   * 处理 MCP 插件安装请求
   * @param parsedData 解析后的协议数据
   * @returns 是否处理成功
   */
  @protocolHandler('install')
  public async handleInstallRequest(parsedData: McpInstallParams): Promise<boolean> {
    try {
      // 从参数中提取必需字段
      const { id, schema: schemaParam, marketId } = parsedData;

      if (!id || !schemaParam) {
        logger.warn(`🔧 [McpInstall] Missing required MCP parameters:`, {
          id: !!id,
          schema: !!schemaParam,
        });
        return false;
      }

      // 解析和验证 MCP Schema
      let mcpSchema: McpSchema;

      try {
        mcpSchema = JSON.parse(schemaParam);
      } catch (error) {
        logger.error(`🔧 [McpInstall] Failed to parse MCP schema:`, error);
        return false;
      }

      if (!validateMcpSchema(mcpSchema)) {
        logger.error(`🔧 [McpInstall] Invalid MCP Schema structure`);
        return false;
      }

      // 验证 identifier 与 id 参数匹配
      if (mcpSchema.identifier !== id) {
        logger.error(`🔧 [McpInstall] Schema identifier does not match URL id parameter:`, {
          schemaId: mcpSchema.identifier,
          urlId: id,
        });
        return false;
      }

      // 映射协议来源
      const source = mapMarketIdToSource(marketId);

      logger.debug(`🔧 [McpInstall] MCP install request validated:`, {
        marketId,
        pluginId: id,
        pluginName: mcpSchema.name,
        pluginVersion: mcpSchema.version,
        source,
      });

      // 广播安装请求到前端
      const installRequest = {
        marketId,
        pluginId: id,
        schema: mcpSchema,
        source,
      };

      logger.debug(`🔧 [McpInstall] Broadcasting install request:`, {
        marketId: installRequest.marketId,
        pluginId: installRequest.pluginId,
        pluginName: installRequest.schema.name,
      });

      // 通过应用实例广播到前端
      if (this.app?.browserManager) {
        this.app.browserManager.broadcastToWindow('chat', 'mcpInstallRequest', installRequest);
        logger.debug(`🔧 [McpInstall] Install request broadcasted successfully`);
        return true;
      } else {
        logger.error(`🔧 [McpInstall] App or browserManager not available`);
        return false;
      }
    } catch (error) {
      logger.error(`🔧 [McpInstall] Error processing install request:`, error);
      return false;
    }
  }
}
