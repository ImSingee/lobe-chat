'use client';

import { McpInstallSchema, useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { Block, Modal } from '@lobehub/ui';
import { App, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useAgentStore } from '@/store/agent';
import { useToolStore } from '@/store/tool';
import { LobeToolCustomPlugin } from '@/types/tool/plugin';

const { Title, Paragraph, Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  configContent: css`
    margin-block-start: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,

  configSection: css`
    margin-block-end: ${token.marginLG}px;
    padding: ${token.paddingSM}px;
    border-radius: ${token.borderRadius}px;
    background-color: ${token.colorFillSecondary};
  `,

  configTitle: css`
    margin-block-end: ${token.marginXS}px;
    font-weight: ${token.fontWeightStrong};
  `,

  metaInfo: css`
    margin-block-end: ${token.marginXS}px;
    color: ${token.colorTextSecondary};
  `,

  warning: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorError};
  `,
}));

interface McpInstallData {
  marketId?: string;
  schema: McpInstallSchema;
}

interface PluginInstallConfirmModalProps {
  data: McpInstallData | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

const PluginInstallConfirmModal = ({
  open,
  data,
  onConfirm,
  onCancel,
  loading,
}: PluginInstallConfirmModalProps) => {
  const { t } = useTranslation('plugin');
  const { styles } = useStyles();

  if (!data) return null;

  const { schema, marketId } = data;

  return (
    <Modal
      confirmLoading={loading}
      okText={t('protocolInstall.actions.install')}
      onCancel={onCancel}
      onOk={onConfirm}
      open={open}
      title={t('protocolInstall.title')}
      width={520}
    >
      <Flexbox gap={16}>
        <Flexbox gap={8}>
          <Title level={4} style={{ margin: 0 }}>
            {schema.name}
          </Title>

          <Flexbox gap={4}>
            <Text className={styles.metaInfo}>
              {t('protocolInstall.meta.author')}: {schema.author}
            </Text>
            <Text className={styles.metaInfo}>
              {t('protocolInstall.meta.version')}: {schema.version}
            </Text>
            {marketId && (
              <Text className={styles.metaInfo}>
                {t('protocolInstall.meta.source')}: {marketId}
              </Text>
            )}
          </Flexbox>

          <Paragraph style={{ margin: 0 }}>{schema.description}</Paragraph>
        </Flexbox>

        <Block className={styles.configSection}>
          <div className={styles.configTitle}>{t('protocolInstall.config.title')}</div>
          <div className={styles.configContent}>
            {schema.config.type === 'stdio' ? (
              <Flexbox gap={4}>
                <div>{t('protocolInstall.config.type.stdio')}</div>
                <div>
                  {t('protocolInstall.config.command')}: {schema.config.command}
                </div>
                {schema.config.args && (
                  <div>
                    {t('protocolInstall.config.args')}: {schema.config.args.join(' ')}
                  </div>
                )}
              </Flexbox>
            ) : (
              <Flexbox gap={4}>
                <div>{t('protocolInstall.config.type.http')}</div>
                <div>
                  {t('protocolInstall.config.url')}: {schema.config.url}
                </div>
              </Flexbox>
            )}
          </div>
        </Block>

        <Text className={styles.warning}>{t('protocolInstall.warning')}</Text>
      </Flexbox>
    </Modal>
  );
};

const ProtocolUrlHandler = () => {
  const { message } = App.useApp();
  const [modalData, setModalData] = useState<{
    data: McpInstallData | null;
    loading: boolean;
    open: boolean;
  }>({
    data: null,
    loading: false,
    open: false,
  });
  const { t } = useTranslation('plugin');

  const [installCustomPlugin] = useToolStore((s) => [s.installCustomPlugin]);
  const togglePlugin = useAgentStore((s) => s.togglePlugin);

  const handleMcpInstallRequest = useCallback(
    async (data: {
      marketId?: string;
      metaParams: Record<string, string>;
      pluginId: string;
      schema: any;
      source: string;
    }) => {
      console.log('Received MCP install request:', data);

      // 直接使用新的简化数据结构
      setModalData({
        data: {
          marketId: data.marketId,
          schema: data.schema,
        },
        loading: false,
        open: true,
      });
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!modalData.data) return;

    setModalData((prev) => ({ ...prev, loading: true }));

    try {
      const { schema } = modalData.data;

      // 构建自定义插件数据
      const customPlugin: LobeToolCustomPlugin = {
        customParams: {
          avatar: '',
          description: schema.description,
          mcp: {
            ...schema.config,
            auth: undefined, // 根据需要设置认证信息
            headers: schema.config.type === 'http' ? schema.config.headers : undefined,
          },
        },
        identifier: schema.identifier,
        manifest: {
          api: [],
          identifier: schema.identifier,
          meta: {
            avatar: '',
            description: schema.description,
            tags: [],
            title: schema.name,
          },
          type: 'default',
          version: '1',
        },
        type: 'customPlugin',
      };

      console.log('Preparing to install plugin:', customPlugin);

      // 安装插件
      await installCustomPlugin(customPlugin);

      // 启用插件
      await togglePlugin(schema.identifier);

      message.success(t('protocolInstall.messages.installSuccess', { name: schema.name }));

      // 关闭对话框
      setModalData({
        data: null,
        loading: false,
        open: false,
      });
    } catch (error) {
      console.error('Plugin installation failed:', error);
      message.error(t('protocolInstall.messages.installError'));
      setModalData((prev) => ({ ...prev, loading: false }));
    }
  }, [modalData.data, installCustomPlugin, togglePlugin, message]);

  const handleCancel = useCallback(() => {
    setModalData({
      data: null,
      loading: false,
      open: false,
    });
  }, []);

  useWatchBroadcast('mcpInstallRequest', handleMcpInstallRequest);

  return (
    <PluginInstallConfirmModal
      data={modalData.data}
      loading={modalData.loading}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      open={modalData.open}
    />
  );
};

export default ProtocolUrlHandler;
