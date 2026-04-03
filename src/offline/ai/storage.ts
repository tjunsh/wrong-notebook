import { KeyValueStore, SecretStore } from './config-store'

type CapacitorPreferences = {
  get: (options: { key: string }) => Promise<{ value: string | null }>
  set: (options: { key: string; value: string }) => Promise<void>
  remove: (options: { key: string }) => Promise<void>
}

type CapacitorLike = {
  isNativePlatform?: () => boolean
  Plugins?: {
    Preferences?: CapacitorPreferences
  }
}

function getCapacitor(): CapacitorLike | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const globalWindow = window as unknown as { Capacitor?: CapacitorLike }
  return globalWindow.Capacitor
}

function hasNativePreferences(): boolean {
  const capacitor = getCapacitor()
  const isNative = capacitor?.isNativePlatform?.() === true
  const preferences = capacitor?.Plugins?.Preferences
  return Boolean(isNative && preferences)
}

function getPreferences(): CapacitorPreferences | undefined {
  return getCapacitor()?.Plugins?.Preferences
}

export class BrowserKvStore implements KeyValueStore {
  async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null
    }

    if (hasNativePreferences()) {
      return (await getPreferences()?.get({ key }))?.value ?? null
    }

    return window.localStorage.getItem(key)
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (hasNativePreferences()) {
      await getPreferences()?.set({ key, value })
      return
    }

    window.localStorage.setItem(key, value)
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (hasNativePreferences()) {
      await getPreferences()?.remove({ key })
      return
    }

    window.localStorage.removeItem(key)
  }
}

export class BrowserSecretStore implements SecretStore {
  async getSecret(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null
    }

    if (hasNativePreferences()) {
      return (await getPreferences()?.get({ key }))?.value ?? null
    }

    return window.localStorage.getItem(key)
  }

  async setSecret(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (hasNativePreferences()) {
      await getPreferences()?.set({ key, value })
      return
    }

    window.localStorage.setItem(key, value)
  }

  async removeSecret(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (hasNativePreferences()) {
      await getPreferences()?.remove({ key })
      return
    }

    window.localStorage.removeItem(key)
  }
}
