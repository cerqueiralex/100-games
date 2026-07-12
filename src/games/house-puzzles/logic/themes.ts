/**
 * Category bank for House Puzzles — all original content.
 * `subject` is the clue phrase for one item ("{item}" placeholder); `kind`
 * steers clue grammar: 'house' subjects describe the house itself, 'person'
 * subjects describe its resident. Every pool holds ≥6 items (extreme uses 6).
 */

export interface HpCategoryTemplate {
  id: string;
  name: string;
  subject: string;
  kind: 'house' | 'person';
  items: string[];
}

/** color is always included — it anchors every puzzle like the classics */
export const COLOR_CATEGORY: HpCategoryTemplate = {
  id: 'color',
  name: 'Color',
  subject: 'the {item} house',
  kind: 'house',
  items: ['green', 'orange', 'purple', 'red', 'blue', 'yellow']
};

export const CATEGORY_BANK: HpCategoryTemplate[] = [
  {
    id: 'movie',
    name: 'Movie',
    subject: 'the one who watches {item} films',
    kind: 'person',
    items: ['comedy', 'drama', 'romance', 'western', 'thriller', 'animation']
  },
  {
    id: 'hobby',
    name: 'Hobby',
    subject: 'the one who loves {item}',
    kind: 'person',
    items: ['hiking', 'painting', 'gaming', 'fishing', 'cooking', 'reading']
  },
  {
    id: 'occupation',
    name: 'Occupation',
    subject: 'the {item}',
    kind: 'person',
    items: ['doctor', 'pilot', 'writer', 'teacher', 'chef', 'engineer']
  },
  {
    id: 'pet',
    name: 'Pet',
    subject: 'the {item} owner',
    kind: 'person',
    items: ['cat', 'dog', 'parrot', 'rabbit', 'turtle', 'hamster']
  },
  {
    id: 'drink',
    name: 'Drink',
    subject: 'the one who drinks {item}',
    kind: 'person',
    items: ['coffee', 'tea', 'juice', 'cocoa', 'lemonade', 'smoothies']
  },
  {
    id: 'flower',
    name: 'Flower',
    subject: 'the house with {item}',
    kind: 'house',
    items: ['roses', 'tulips', 'lilies', 'orchids', 'daisies', 'violets']
  },
  {
    id: 'fruit',
    name: 'Fruit',
    subject: 'the one who eats {item}',
    kind: 'person',
    items: ['apples', 'cherries', 'mangoes', 'plums', 'peaches', 'grapes']
  },
  {
    id: 'tree',
    name: 'Tree',
    subject: 'the house shaded by the {item}',
    kind: 'house',
    items: ['elm', 'oak', 'maple', 'spruce', 'willow', 'cedar']
  },
  {
    id: 'sport',
    name: 'Sport',
    subject: 'the one who plays {item}',
    kind: 'person',
    items: ['tennis', 'soccer', 'cycling', 'rowing', 'karate', 'golf']
  },
  {
    id: 'music',
    name: 'Music',
    subject: 'the one who listens to {item}',
    kind: 'person',
    items: ['jazz', 'rock', 'classical', 'folk', 'reggae', 'blues']
  }
];
