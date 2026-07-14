import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { CodeBreakerGame } from './CodeBreakerGame';
import { codeBreakerTutorial } from './tutorial';

export const codeBreakerDefinition: GameDefinition = {
  id: 'code-breaker',
  category: 'logic',
  name: 'Code Breaker',
  tagline: 'Crack the secret color code from the peg clues.',
  icon: gameIcons['code-breaker'],
  component: CodeBreakerGame,
  tutorial: codeBreakerTutorial,
  scoringNote:
    'Crack codes of 3–6 pegs drawn from 5–9 colors (repeats appear from Hard up) within 8–12 guesses. Winning scores 150 × difficulty (1–5) plus 25 × difficulty per unused guess, −40 per hint; a lost game keeps 10 × difficulty per exact peg of your best guess. Guesses with no exact-position peg count as errors.',
  assistFeatures: [
    {
      id: 'notes',
      name: 'Rule-out notes',
      description:
        'Shows a tappable color tracker above your guess to strike out colors you have eliminated. Counts as help.',
      defaultOn: true
    },
    {
      id: 'consistency',
      name: 'Contradiction check',
      description:
        'Flags your composed guess in red before you submit if it contradicts earlier feedback. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Hint button',
      description:
        'Reveals one correct peg and locks it in place (−40, max 2 per game). Counts as help when used.',
      defaultOn: true
    }
  ]
};
