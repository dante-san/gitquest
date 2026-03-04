import type { GitCommand } from './GitEngine'

export interface ParsedCommand {
  ok: boolean
  error?: string
  command?: GitCommand
}

const SUPPORTED = ['commit', 'branch', 'checkout', 'merge']

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, error: 'Type a Git command to get started.' }
  }

  if (!raw.startsWith('git ')) {
    return {
      ok: false,
      error: 'Commands should start with `git`. Example: git commit',
    }
  }

  const [, ...rest] = raw.split(/\s+/)
  const [cmd, ...args] = rest
  if (!cmd) {
    return { ok: false, error: 'Missing Git subcommand. Try `git commit`.' }
  }

  if (!SUPPORTED.includes(cmd)) {
    return {
      ok: false,
      error: `Unsupported subcommand "${cmd}". Supported: ${SUPPORTED.join(', ')}.`,
    }
  }

  switch (cmd) {
    case 'commit': {
      const msgIndex = args.findIndex((a) => a === '-m')
      let message: string | undefined
      if (msgIndex >= 0 && args[msgIndex + 1]) {
        message = args.slice(msgIndex + 1).join(' ').replace(/^["']|["']$/g, '')
      }
      return { ok: true, command: { type: 'commit', message } }
    }
    case 'branch': {
      const name = args[0]
      if (!name) {
        return { ok: false, error: 'Usage: git branch <name>' }
      }
      return { ok: true, command: { type: 'branch', name } }
    }
    case 'checkout': {
      const name = args[0]
      if (!name) {
        return { ok: false, error: 'Usage: git checkout <branch>' }
      }
      return { ok: true, command: { type: 'checkout', name } }
    }
    case 'merge': {
      const name = args[0]
      if (!name) {
        return { ok: false, error: 'Usage: git merge <branch>' }
      }
      return { ok: true, command: { type: 'merge', name } }
    }
    default:
      return { ok: false, error: 'Unknown error while parsing command.' }
  }
}

export const AUTOCOMPLETE_TOKENS = [
  'git commit',
  'git commit -m ""',
  'git branch ',
  'git checkout ',
  'git merge ',
]

