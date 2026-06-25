'use client';

import { useContext } from 'react';
import { MiniAppEnvironmentContext } from '@/components/mini-app-environment-provider';
import type { MiniAppEnvironment } from '@/lib/mini-app-environment';

const PENDING: MiniAppEnvironment = {
  environment: 'web',
  isMiniPay: false,
  isFarcaster: false,
  isAutoConnect: false,
  isReady: false,
};

export function useMiniAppEnvironment(): MiniAppEnvironment {
  return useContext(MiniAppEnvironmentContext) ?? PENDING;
}
