declare module 'claude-code' {
  interface PluginState {
    'handoff-button': { percent: number | null; isSent: boolean }
  }
}
