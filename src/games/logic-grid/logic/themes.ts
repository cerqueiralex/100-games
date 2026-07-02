/**
 * Original theme bank for logic grid puzzles. Every theme provides a primary
 * "people" category plus companion categories; item pools hold ≥6 entries so
 * any 3–5 can be drawn. At most one numeric category is used per puzzle —
 * numeric categories enable comparative clues ("…is older than…").
 * All names, items and stories here are original content for this game.
 */

export interface ThemeCategoryTemplate {
  id: string;
  name: string;
  /** phrase with {item}, denoting the person, e.g. "the {item} owner" */
  phrase: string;
  pool?: string[];
  numeric?: {
    pool: number[];
    format: (v: number) => string;
    unit: string;
    lessWord: string;
    moreWord: string;
  };
}

export interface Theme {
  id: string;
  /** story template; {n} replaced with the number of people */
  story: string;
  primary: ThemeCategoryTemplate;
  others: ThemeCategoryTemplate[];
}

export const THEMES: Theme[] = [
  {
    id: 'neighbors',
    story:
      '{n} neighbors live side by side on Maple Lane, and no two of them share a pet, a favorite drink or a front-door color. Work out who is who.',
    primary: { id: 'names', name: 'Neighbor', phrase: '{item}', pool: ['Alice', 'Bruno', 'Carla', 'Diego', 'Elena', 'Felix'] },
    others: [
      { id: 'pets', name: 'Pet', phrase: 'the {item} owner', pool: ['dog', 'cat', 'parrot', 'hamster', 'turtle', 'goldfish'] },
      { id: 'drinks', name: 'Drink', phrase: 'the {item} drinker', pool: ['tea', 'coffee', 'juice', 'cocoa', 'lemonade', 'water'] },
      { id: 'doors', name: 'Door', phrase: 'the one with the {item} door', pool: ['red', 'blue', 'green', 'white', 'yellow', 'purple'] },
      {
        id: 'ages', name: 'Age', phrase: 'the {item}',
        numeric: { pool: [29, 31, 34, 36, 39, 42], format: (v) => `${v}-year-old`, unit: 'year', lessWord: 'younger', moreWord: 'older' }
      }
    ]
  },
  {
    id: 'bakery',
    story:
      'The morning rush at the corner bakery: {n} regulars each ordered a different pastry at a different time, and none of them paid the same amount.',
    primary: { id: 'names', name: 'Customer', phrase: '{item}', pool: ['Marta', 'Nico', 'Otto', 'Pia', 'Ravi', 'Sofia'] },
    others: [
      { id: 'pastries', name: 'Pastry', phrase: 'the one who bought the {item}', pool: ['croissant', 'muffin', 'scone', 'brownie', 'donut', 'tartlet'] },
      { id: 'toppings', name: 'Coffee', phrase: 'the {item} orderer', pool: ['espresso', 'latte', 'mocha', 'cappuccino', 'flat white', 'americano'] },
      {
        id: 'prices', name: 'Paid', phrase: 'the one who paid {item}',
        numeric: { pool: [4, 5, 6, 7, 8, 9], format: (v) => `$${v}`, unit: 'dollar', lessWord: 'less', moreWord: 'more' }
      },
      { id: 'seats', name: 'Table', phrase: 'the one at the {item} table', pool: ['window', 'corner', 'counter', 'patio', 'booth', 'garden'] }
    ]
  },
  {
    id: 'sportsday',
    story:
      'At the neighborhood sports day, {n} friends each entered a different event wearing a different color, and they all finished with different times.',
    primary: { id: 'names', name: 'Athlete', phrase: '{item}', pool: ['Ana', 'Bela', 'Caio', 'Dora', 'Enzo', 'Fabi'] },
    others: [
      { id: 'events', name: 'Event', phrase: 'the {item} competitor', pool: ['sprint', 'long jump', 'relay', 'hurdles', 'shot put', 'high jump'] },
      { id: 'shirts', name: 'Shirt', phrase: 'the athlete in {item}', pool: ['red', 'blue', 'green', 'orange', 'purple', 'black'] },
      {
        id: 'minutes', name: 'Warm-up', phrase: 'the one who warmed up for {item}',
        numeric: { pool: [10, 15, 20, 25, 30, 35], format: (v) => `${v} min`, unit: 'minute', lessWord: 'less', moreWord: 'longer' }
      },
      { id: 'snacks', name: 'Snack', phrase: 'the {item} eater', pool: ['banana', 'granola bar', 'orange', 'yogurt', 'pretzel', 'apple'] }
    ]
  },
  {
    id: 'travelers',
    story:
      '{n} coworkers each booked a trip to a different country in a different month, and no two of them chose the same kind of luggage.',
    primary: { id: 'names', name: 'Traveler', phrase: '{item}', pool: ['Gil', 'Hana', 'Igor', 'Julia', 'Kenji', 'Lara'] },
    others: [
      { id: 'countries', name: 'Country', phrase: 'the one flying to {item}', pool: ['Japan', 'Peru', 'Norway', 'Egypt', 'Canada', 'Greece'] },
      {
        id: 'months', name: 'Month', phrase: 'the {item} traveler',
        numeric: { pool: [1, 3, 5, 7, 9, 11], format: (v) => ['January', 'March', 'May', 'July', 'September', 'November'][(v - 1) / 2], unit: 'month', lessWord: 'earlier', moreWord: 'later' }
      },
      { id: 'bags', name: 'Luggage', phrase: 'the one with the {item}', pool: ['backpack', 'duffel bag', 'red suitcase', 'trolley', 'satchel', 'sea chest'] },
      { id: 'souvenirs', name: 'Souvenir', phrase: 'the one buying {item}', pool: ['magnets', 'postcards', 'spices', 'a poster', 'chocolates', 'a mug'] }
    ]
  },
  {
    id: 'library',
    story:
      'Closing time at the library: {n} readers each checked out a different book genre from a different floor, each using a different bookmark.',
    primary: { id: 'names', name: 'Reader', phrase: '{item}', pool: ['Mila', 'Noel', 'Olga', 'Paulo', 'Rita', 'Sami'] },
    others: [
      { id: 'genres', name: 'Genre', phrase: 'the {item} reader', pool: ['mystery', 'sci-fi', 'poetry', 'history', 'fantasy', 'biography'] },
      {
        id: 'floors', name: 'Floor', phrase: 'the one on floor {item}',
        numeric: { pool: [1, 2, 3, 4, 5, 6], format: (v) => `${v}`, unit: 'floor', lessWord: 'lower', moreWord: 'higher' }
      },
      { id: 'bookmarks', name: 'Bookmark', phrase: 'the one with the {item} bookmark', pool: ['leather', 'ribbon', 'paper', 'magnetic', 'wooden', 'metal'] },
      { id: 'drinks2', name: 'Thermos', phrase: 'the one sipping {item}', pool: ['green tea', 'black coffee', 'chai', 'hot cocoa', 'mint tea', 'cider'] }
    ]
  },
  {
    id: 'band',
    story:
      'The school band is warming up: {n} musicians each play a different instrument, rehearse in a different room and joined in a different year.',
    primary: { id: 'names', name: 'Musician', phrase: '{item}', pool: ['Tess', 'Ugo', 'Vera', 'Wim', 'Xavi', 'Yara'] },
    others: [
      { id: 'instruments', name: 'Instrument', phrase: 'the {item} player', pool: ['drums', 'guitar', 'trumpet', 'piano', 'violin', 'flute'] },
      { id: 'rooms', name: 'Room', phrase: 'the one in the {item} room', pool: ['red', 'blue', 'green', 'amber', 'silver', 'gold'] },
      {
        id: 'years', name: 'Joined', phrase: 'the one who joined in {item}',
        numeric: { pool: [2019, 2020, 2021, 2022, 2023, 2024], format: (v) => `${v}`, unit: 'year', lessWord: 'earlier', moreWord: 'later' }
      },
      { id: 'pieces', name: 'Solo', phrase: 'the one performing the {item} solo', pool: ['jazz', 'waltz', 'march', 'ballad', 'tango', 'samba'] }
    ]
  }
];

export function themeById(id: string): Theme {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`unknown theme: ${id}`);
  return t;
}
