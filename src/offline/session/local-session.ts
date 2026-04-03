export interface LocalSession {
  ownerProfileId: string
}

export interface LocalSessionStore {
  getCurrentSession(): Promise<LocalSession | null>
  setCurrentSession(session: LocalSession): Promise<void>
  clearCurrentSession(): Promise<void>
}

export class InMemoryLocalSessionStore implements LocalSessionStore {
  private current: LocalSession | null = null

  async getCurrentSession(): Promise<LocalSession | null> {
    return this.current
  }

  async setCurrentSession(session: LocalSession): Promise<void> {
    this.current = session
  }

  async clearCurrentSession(): Promise<void> {
    this.current = null
  }
}

export class LocalSessionService {
  constructor(
    private readonly sessionStore: LocalSessionStore,
    private readonly defaultProfileId: string,
  ) {}

  async resolveOwnerProfileId(): Promise<string> {
    const session = await this.sessionStore.getCurrentSession()
    return session?.ownerProfileId ?? this.defaultProfileId
  }

  async switchOwner(ownerProfileId: string): Promise<void> {
    await this.sessionStore.setCurrentSession({ ownerProfileId })
  }

  async clear(): Promise<void> {
    await this.sessionStore.clearCurrentSession()
  }
}
