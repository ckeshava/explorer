import { isValidElement, FC, PropsWithChildren } from 'react'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { I18nextProvider } from 'react-i18next'
import { QueryClientProvider } from 'react-query'
import { MemoryRouter, Routes } from 'react-router'
import { Route } from 'react-router-dom'
// Note: Refer to this discussion regarding the necessity of the below import: https://github.com/prisma/prisma/issues/8558
import { setImmediate } from 'timers'
import type i18n from '../../i18n/testConfig'
import { testQueryClient } from './QueryClient'
import { AnalyticsSetPath } from '../shared/analytics'

export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve))
}

// @ts-ignore
Helmet.defaultProps.defer = false

export const QuickHarness: FC<
  PropsWithChildren<{
    i18n: typeof i18n
    initialEntries?: string[] | undefined
  }>
> = ({ i18n: i18nConfig, children, initialEntries }) => (
  <QueryClientProvider client={testQueryClient}>
    <I18nextProvider i18n={i18nConfig}>
      <HelmetProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AnalyticsSetPath />
          {isValidElement(children) && children?.type === Route ? (
            <Routes>{children}</Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </HelmetProvider>
    </I18nextProvider>
  </QueryClientProvider>
)
