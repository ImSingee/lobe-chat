'use client';

import { Spin } from 'antd';
import { createStore, getMany } from 'idb-keyval';
import dynamic from 'next/dynamic';
import { PropsWithChildren, memo, useEffect, useState } from 'react';

import { useGlobalStore } from '@/store/global';

import { MIGRATE_KEY, V1DB_NAME, V1DB_TABLE_NAME } from './const';

const Modal = dynamic(() => import('./Modal'), { loading: () => <Spin fullscreen />, ssr: false });

const KeyProvider = memo(() => {
  const setConfig = useGlobalStore((s) => s.setModelProviderConfig);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.hash.slice(1));
    const key = urlParams.get('key');
    if (key) {
      console.debug('will setApiKey', key);
      setConfig('openAI', { OPENAI_API_KEY: key });

      urlParams.delete('key');
      location.hash = urlParams.toString();
    }
  }, [setConfig]);

  return null;
});

const Migration = memo<PropsWithChildren>(({ children }) => {
  const [dbState, setDbState] = useState(null);
  const [open, setOpen] = useState(false);

  const checkMigration = async () => {
    const [state, migrated] = await getMany(
      ['state', MIGRATE_KEY],
      createStore(V1DB_NAME, V1DB_TABLE_NAME),
    );

    // if db have migrated already, don't show modal
    if (migrated) return;

    // if db doesn't exist state key,it means a new user
    if (!state) return;

    setDbState(state);
    setOpen(true);
  };

  useEffect(() => {
    checkMigration();
  }, []);

  return (
    <>
      {open && <Modal open={open} setOpen={setOpen} state={dbState} />}
      <KeyProvider />
      {children}
    </>
  );
});

export default Migration;
