import type { LevelDefinition } from './level01'
import { level01 } from './level01'
import { level02 } from './level02'
import { extraLevels } from './autoLevels'

export type { LevelDefinition } from './level01'

export const levels: LevelDefinition[] = [level01, level02, ...extraLevels]

