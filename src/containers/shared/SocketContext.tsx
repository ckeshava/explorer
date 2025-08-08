import React, { useContext, createContext, useEffect, useState } from 'react'
import { XrplClient } from 'xrpl-client'
import { useAnalytics } from './analytics'
import logger from '../../rippled/lib/logger'

const log = logger({ name: 'socket-context' })

const LOCALHOST_URLS = ['localhost', '127.0.0.1', '0.0.0.0']

export interface ExplorerXrplClient extends XrplClient {
  p2pSocket: XrplClient
  rippledUrl: string | undefined
}

function isInsecureWs(rippledHost: string | undefined): boolean {
  return (
    !!Number(process.env.VITE_INSECURE_WS) ||
    LOCALHOST_URLS.some((url) => rippledHost?.includes(url)) ||
    rippledHost === ''
  )
}

function getSocket(rippledUrl?: string): ExplorerXrplClient {
  const hosts = rippledUrl
    ? [rippledUrl]
    : process.env.VITE_RIPPLED_HOST?.split(',') || []

  const wsUrls: string[] = []

  hosts.forEach((host) => {
    const prefix = isInsecureWs(host) ? 'ws' : 'wss'

    if (host?.includes(':')) {
      wsUrls.push(`${prefix}://${host}`)
    } else if (process.env.VITE_RIPPLED_WS_PORT) {
      wsUrls.push(`${prefix}://${host}:${process.env.VITE_RIPPLED_WS_PORT}`)
      if (process.env.VITE_ENVIRONMENT === 'custom') {
        wsUrls.push(`${prefix}://${host}`)
      }
    } else {
      wsUrls.push(`${prefix}://${host}`)
    }
  })

  console.log('INFO: Creating a new WebSocket connection', wsUrls)
  console.log('INFO: WebSocket initiation timestamp', new Date().toISOString())

  const socket = new XrplClient(wsUrls, {
    tryAllNodes: true,
  }) as ExplorerXrplClient
  const hasP2PSocket =
    process.env.VITE_P2P_RIPPLED_HOST != null &&
    process.env.VITE_P2P_RIPPLED_HOST !== ''
  // @ts-ignore - will be removed eventually
  socket.p2pSocket = hasP2PSocket
    ? new XrplClient([
        `${isInsecureWs(process.env.VITE_P2P_RIPPLED_HOST) ? 'ws' : 'wss'}://${
          process.env.VITE_P2P_RIPPLED_HOST
        }:${process.env.VITE_RIPPLED_WS_PORT}`,
      ])
    : undefined

  socket.rippledUrl = rippledUrl
  return socket
}

const SocketContext = createContext<ExplorerXrplClient>(undefined!)

export type SocketProviderProps = React.PropsWithChildren<{
  children: any
  rippledUrl?: string
}>

export const SocketProvider = ({
  children,
  rippledUrl,
}: SocketProviderProps) => {
  const socket = getSocket(rippledUrl)
  const { setGlobals } = useAnalytics()

  socket.once('online', () => {
    setGlobals({
      entrypoint: socket.getState().server.uri,
    })
  })

  useEffect(() => () => {
    socket.close()
    if (socket.p2pSocket !== undefined) {
      socket.p2pSocket.close()
    }
  })
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

/**
 * Hook that says whether the global socket is currently connected
 */
const useIsOnline = () => {
  const rippledSocket = useContext(SocketContext)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const setIsReadyTrue = () => {
      setIsOnline(true)
      log.info(
        `rippled socket is online at timestamp: ${new Date().toISOString()} ${rippledSocket.getState().server.uri}`,
      )
    }
    const setIsReadyFalse = () => {
      setIsOnline(false)
      log.info(
        `rippled socket is offline at timestamp: ${new Date().toISOString()}`,
      )
    }
    rippledSocket.ready().then(() => {
      // Why is this effect called 3 times? Is the component mounted 3 times?
      console.log('rippledSocket.ready() side-effect:')
      setIsReadyTrue()
      rippledSocket.on('online', setIsReadyTrue) // is this call useful? online is not an event triggered by xrpl-client
      rippledSocket.on('offline', setIsReadyFalse)
    })
    return () => {
      console.log('clean up function:')
      rippledSocket.off('online', setIsReadyTrue)
      rippledSocket.off('offline', setIsReadyFalse)
    }
  }, [rippledSocket])

  return {
    isOnline,
  }
}

export { getSocket, useIsOnline }

export default SocketContext
