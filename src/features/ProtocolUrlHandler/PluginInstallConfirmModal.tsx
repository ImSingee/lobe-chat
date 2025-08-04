'use client';

import { McpInstallSchema } from '@lobechat/electron-client-ipc';
import { Block, Modal } from '@lobehub/ui';
import { App, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useCallback, useEffect, useState } from 'react';
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

export interface McpInstallRequest {
  marketId?: string;
  metaParams: Record<string, string>;
  pluginId: string;
  schema: McpInstallSchema;
  source: string;
}

interface PluginInstallConfirmModalProps {
  installRequest: McpInstallRequest | null;
  onComplete?: () => void;
}

const PluginInstallConfirmModal = memo<PluginInstallConfirmModalProps>(
  ({ installRequest, onComplete }) => {
    const { message } = App.useApp();
    const { t } = useTranslation('plugin');
    const { styles } = useStyles();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [installCustomPlugin] = useToolStore((s) => [s.installCustomPlugin]);
    const togglePlugin = useAgentStore((s) => s.togglePlugin);

    // 当接收到安装请求时显示模态框
    useEffect(() => {
      if (installRequest) {
        setOpen(true);
      } else {
        setOpen(false);
        setLoading(false);
      }
    }, [installRequest]);

    const handleConfirm = useCallback(async () => {
      if (!installRequest) return;

      setLoading(true);

      try {
        const { schema } = installRequest;

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

        // 完成安装，通知父组件
        setOpen(false);
        onComplete?.();
      } catch (error) {
        console.error('Plugin installation failed:', error);
        message.error(t('protocolInstall.messages.installError'));
        setLoading(false);
      }
    }, [installRequest, installCustomPlugin, togglePlugin, message, t, onComplete]);

    const handleCancel = useCallback(() => {
      setOpen(false);
      onComplete?.();
    }, [onComplete]);

    if (!installRequest) return null;

    const { schema, marketId } = installRequest;

    return (
      <Modal
        confirmLoading={loading}
        okText={t('protocolInstall.actions.install')}
        onCancel={handleCancel}
        onOk={handleConfirm}
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
  },
);

PluginInstallConfirmModal.displayName = 'PluginInstallConfirmModal';

export default PluginInstallConfirmModal;
