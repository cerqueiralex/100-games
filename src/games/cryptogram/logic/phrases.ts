import type { Difficulty } from '../../../platform/types';

export interface CryptoPhrase {
  id: string;
  text: string; // uppercase A–Z and spaces only (validated by npm run validate)
}

export const PHRASES: Record<Difficulty, CryptoPhrase[]> = {
  easy: [
    { id: 'e1', text: 'PRACTICE MAKES PERFECT' },
    { id: 'e2', text: 'BETTER LATE THAN NEVER' },
    { id: 'e3', text: 'KNOWLEDGE IS POWER' },
    { id: 'e4', text: 'TIME HEALS ALL WOUNDS' },
    { id: 'e5', text: 'FORTUNE FAVORS THE BOLD' }
  ],
  medium: [
    { id: 'm1', text: 'ACTIONS SPEAK LOUDER THAN WORDS EVER COULD' },
    { id: 'm2', text: 'A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP' },
    { id: 'm3', text: 'THE EARLY BIRD CATCHES THE WORM BUT THE SECOND MOUSE GETS THE CHEESE' },
    { id: 'm4', text: 'DO NOT COUNT YOUR CHICKENS BEFORE THEY HATCH' },
    { id: 'm5', text: 'EVERY CLOUD HAS A SILVER LINING IF YOU LOOK HARD ENOUGH' }
  ],
  hard: [
    { id: 'h1', text: 'IT IS NOT THE MOUNTAIN WE CONQUER BUT OURSELVES ALONG THE WAY' },
    { id: 'h2', text: 'IN THE MIDDLE OF EVERY DIFFICULTY LIES A HIDDEN OPPORTUNITY' },
    { id: 'h3', text: 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG WHILE EVERYONE WATCHES' },
    { id: 'h4', text: 'WHAT WE THINK WE BECOME AND WHAT WE IMAGINE WE CREATE' },
    { id: 'h5', text: 'COURAGE IS NOT THE ABSENCE OF FEAR BUT THE TRIUMPH OVER IT' }
  ]
};

export function pickPhrase(difficulty: Difficulty): CryptoPhrase {
  const list = PHRASES[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}
