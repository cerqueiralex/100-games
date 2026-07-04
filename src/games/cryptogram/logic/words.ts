import type { Difficulty } from '../../../platform/types';
import { CIPHER_GLYPH_COUNT } from '../../../platform/design/icons';

/**
 * Content for the Cryptogram picture cipher (all hand-authored, original):
 *  - WORD_BANK: definition-style clues for the row words
 *  - HIDDEN_ANSWERS: the vertical answers with their table-top clue
 *  - generateCryptoPuzzle: assembles a puzzle where every row word contains
 *    one letter of the hidden answer, aligned in a single shaded column,
 *    and every letter of the alphabet maps to one shuffled pictogram.
 * Everything here is covered by `npm run validate`.
 */

export interface BankEntry {
  word: string; // uppercase A–Z, 4–10 letters
  clue: string;
}

export interface HiddenAnswer {
  answer: string; // uppercase, one or two words separated by a single space
  clue: string;
}

export interface CryptoRowDef {
  word: string;
  clue: string;
  /** Index within `word` that holds this row's hidden-answer letter. */
  hiddenIndex: number;
}

export interface CryptoPuzzle {
  clue: string;
  answer: string;
  rows: CryptoRowDef[];
  /** Row index where the answer's second word begins (visual gap), if any. */
  groupBreak: number | null;
  /** letter -> glyph index (0..25); same letter = same pictogram everywhere. */
  glyphOf: Record<string, number>;
  /** The shared column (in tiles) where every hidden letter aligns. */
  col: number;
  /** Total tile columns the widest row spans. */
  cols: number;
}

export const WORD_BANK: BankEntry[] = [
  // ---- 4 letters ----
  { word: 'MOON', clue: "Earth's pale companion in the night sky." },
  { word: 'FROG', clue: 'Green jumper that croaks by the pond.' },
  { word: 'LAMP', clue: 'Bedside light with a shade.' },
  { word: 'NEST', clue: 'Twig home a bird builds.' },
  { word: 'KITE', clue: 'Diamond on a string that rides the wind.' },
  { word: 'SNOW', clue: 'White flakes of winter.' },
  { word: 'WOLF', clue: 'Wild cousin of the dog that howls.' },
  { word: 'MASK', clue: 'Face cover worn at carnival.' },
  { word: 'RING', clue: 'Circle of gold worn on a finger.' },
  { word: 'DRUM', clue: 'Instrument you strike with sticks.' },
  { word: 'CAVE', clue: 'Dark hollow in a hillside.' },
  { word: 'SHIP', clue: 'Large vessel that crosses oceans.' },
  { word: 'GATE', clue: 'Swinging entrance in a fence.' },
  { word: 'BEAR', clue: 'Heavy forest animal that hibernates.' },
  { word: 'CORN', clue: 'Yellow cob eaten at barbecues.' },
  { word: 'LION', clue: 'Big cat with a mane.' },
  { word: 'ROSE', clue: 'Thorny flower of romance.' },
  { word: 'FORK', clue: 'Pronged partner of the knife.' },
  { word: 'HIVE', clue: 'Buzzing home of bees.' },
  { word: 'IRON', clue: 'Metal pressed against wrinkled shirts.' },
  { word: 'ECHO', clue: 'Sound that bounces back to you.' },
  { word: 'TUNA', clue: 'Big fish found in sandwich cans.' },
  { word: 'VASE', clue: 'Container that holds cut flowers.' },
  { word: 'OPAL', clue: 'Milky gemstone with shifting colors.' },
  { word: 'YOGA', clue: 'Stretching practice on a mat.' },
  { word: 'DICE', clue: 'Cubes rolled in board games.' },
  { word: 'LAVA', clue: 'Molten rock from a volcano.' },
  { word: 'WAVE', clue: 'Rolling ridge of seawater.' },
  { word: 'HAWK', clue: 'Sharp-eyed bird of prey.' },
  { word: 'BELL', clue: 'It rings from the church tower.' },
  { word: 'MINT', clue: 'Herb that cools your breath.' },
  { word: 'PLUM', clue: 'Purple stone fruit.' },
  { word: 'SWAN', clue: 'Graceful white bird of lakes.' },
  { word: 'TENT', clue: 'Portable canvas shelter for campers.' },
  { word: 'STAR', clue: 'Distant sun twinkling at night.' },
  // ---- 5 letters ----
  { word: 'APPLE', clue: 'Crisp fruit that falls near its tree.' },
  { word: 'BREAD', clue: 'Baked loaf sliced for toast.' },
  { word: 'CHAIR', clue: 'Seat with four legs and a back.' },
  { word: 'EAGLE', clue: 'Soaring raptor with a hooked beak.' },
  { word: 'FLAME', clue: 'Bright tongue of a fire.' },
  { word: 'GRAPE', clue: 'Small fruit picked in bunches from vines.' },
  { word: 'HONEY', clue: 'Golden sweetness made by bees.' },
  { word: 'IGLOO', clue: 'Dome house built from blocks of ice.' },
  { word: 'JUICE', clue: 'Drink squeezed from fresh fruit.' },
  { word: 'KOALA', clue: 'Sleepy eucalyptus eater from Australia.' },
  { word: 'KAYAK', clue: 'Slim paddle boat for one.' },
  { word: 'LEMON', clue: 'Sour yellow citrus.' },
  { word: 'MANGO', clue: 'Tropical fruit with a large flat pit.' },
  { word: 'NURSE', clue: 'Hospital caregiver in scrubs.' },
  { word: 'OCEAN', clue: 'Vast body of salt water.' },
  { word: 'PIANO', clue: 'Keyboard instrument with 88 keys.' },
  { word: 'QUEEN', clue: 'Female monarch on a throne.' },
  { word: 'RIVER', clue: 'Fresh water flowing to the sea.' },
  { word: 'SUGAR', clue: 'Sweet crystals stirred into coffee.' },
  { word: 'TIGER', clue: 'Striped jungle cat.' },
  { word: 'UNCLE', clue: "Your parent's brother." },
  { word: 'VOICE', clue: 'What a singer trains.' },
  { word: 'WAGON', clue: 'Four-wheeled cart pulled along.' },
  { word: 'YACHT', clue: 'Luxury sailing boat.' },
  { word: 'ZEBRA', clue: 'Striped horse of the savanna.' },
  { word: 'ONION', clue: 'Layered bulb that makes cooks cry.' },
  { word: 'ACORN', clue: 'Nut an oak tree drops.' },
  { word: 'ROBIN', clue: 'Songbird with a red breast.' },
  { word: 'CROWN', clue: 'Jeweled headpiece of royalty.' },
  { word: 'STORM', clue: 'Violent weather with wind and rain.' },
  { word: 'CLOUD', clue: 'Fluffy white shape drifting overhead.' },
  { word: 'TRAIN', clue: 'It runs on rails between stations.' },
  { word: 'MOUSE', clue: 'Tiny rodent fond of cheese.' },
  { word: 'SHELL', clue: 'Hard coat a snail carries.' },
  { word: 'PEARL', clue: 'Treasure grown inside an oyster.' },
  { word: 'TORCH', clue: 'Handheld flame lighting the dark.' },
  { word: 'CANDY', clue: 'Sweet treat sold at the fair.' },
  { word: 'GLOBE', clue: 'Spinning model of the Earth.' },
  { word: 'PLANT', clue: 'Green thing growing in a pot.' },
  { word: 'BRICK', clue: 'Clay block used to build walls.' },
  { word: 'STAGE', clue: 'Platform where actors perform.' },
  { word: 'WHEAT', clue: 'Golden grain milled into flour.' },
  { word: 'SPOON', clue: 'Rounded utensil for soup.' },
  { word: 'KNIFE', clue: 'Sharp blade beside the fork.' },
  { word: 'OLIVE', clue: 'Small fruit pressed into oil.' },
  { word: 'SKATE', clue: 'Glide on blades across the ice.' },
  { word: 'STORY', clue: 'Tale told before bedtime.' },
  { word: 'MAPLE', clue: 'Tree whose sap becomes syrup.' },
  { word: 'CAMEL', clue: 'Desert animal with humps.' },
  { word: 'SNAIL', clue: 'Slow creature leaving a silver trail.' },
  { word: 'PEACH', clue: 'Fuzzy fruit with a stone heart.' },
  { word: 'TULIP', clue: 'Spring bulb flower from Holland.' },
  { word: 'CORAL', clue: 'Reef builder of warm seas.' },
  { word: 'RAVEN', clue: 'Large black bird of omens.' },
  { word: 'WHALE', clue: 'Largest animal in the ocean.' },
  { word: 'BADGE', clue: 'Metal emblem an officer wears.' },
  { word: 'MEDAL', clue: 'Round award hung on a ribbon.' },
  { word: 'NORTH', clue: 'Direction a compass needle points.' },
  { word: 'ANVIL', clue: 'Iron block a blacksmith hammers on.' },
  { word: 'DAISY', clue: 'White petals around a sunny center.' },
  { word: 'HOUND', clue: 'Dog bred to follow a scent.' },
  { word: 'LUNCH', clue: 'Midday meal.' },
  { word: 'BERRY', clue: 'Small juicy fruit picked in summer.' },
  { word: 'EIGHT', clue: 'Number of legs on a spider.' },
  { word: 'VIVID', clue: 'Strikingly bright and intense.' },
  { word: 'QUILT', clue: 'Patchwork blanket sewn by hand.' },
  // ---- 6 letters ----
  { word: 'WINTER', clue: 'Coldest season of the year.' },
  { word: 'GARDEN', clue: 'Plot where flowers and vegetables grow.' },
  { word: 'CASTLE', clue: 'Stone fortress with towers and a moat.' },
  { word: 'BRIDGE', clue: 'Structure that spans a river.' },
  { word: 'CANDLE', clue: 'Wax stick with a burning wick.' },
  { word: 'MIRROR', clue: 'Glass that shows your reflection.' },
  { word: 'ROCKET', clue: 'Vehicle that blasts off to space.' },
  { word: 'TURTLE', clue: 'Reptile that carries its house.' },
  { word: 'VIOLET', clue: 'Purple flower of early spring.' },
  { word: 'WIZARD', clue: 'Robed caster of spells.' },
  { word: 'YELLOW', clue: 'Color of lemons and school buses.' },
  { word: 'ZIPPER', clue: 'Toothed fastener on a jacket.' },
  { word: 'ANCHOR', clue: 'Heavy hook that holds a ship in place.' },
  { word: 'BUTTON', clue: 'Small disc that closes a shirt.' },
  { word: 'CIRCUS', clue: 'Big-top show with acrobats.' },
  { word: 'DRAGON', clue: 'Fire-breathing beast of legend.' },
  { word: 'ENGINE', clue: 'Machine that powers a car.' },
  { word: 'FOREST', clue: 'Deep woods full of tall trees.' },
  { word: 'GUITAR', clue: 'Six-stringed instrument strummed by hand.' },
  { word: 'HAMMER', clue: 'Tool that drives nails.' },
  { word: 'ISLAND', clue: 'Land surrounded by water.' },
  { word: 'JUNGLE', clue: 'Dense tropical wilderness.' },
  { word: 'KETTLE', clue: 'It whistles when the water boils.' },
  { word: 'LADDER', clue: 'Rungs you climb to reach the roof.' },
  { word: 'MARBLE', clue: 'Polished stone of sculptors.' },
  { word: 'NAPKIN', clue: 'Cloth square on your lap at dinner.' },
  { word: 'ORANGE', clue: 'Citrus fruit and its color.' },
  { word: 'PENCIL', clue: 'Writing stick you can erase.' },
  { word: 'RABBIT', clue: 'Long-eared hopper fond of carrots.' },
  { word: 'SPIDER', clue: 'Eight-legged web weaver.' },
  { word: 'TEMPLE', clue: 'Sacred building of worship.' },
  { word: 'VALLEY', clue: 'Low land between hills.' },
  { word: 'WALNUT', clue: 'Wrinkled nut in a hard shell.' },
  { word: 'CANYON', clue: 'Deep gorge carved by a river.' },
  { word: 'CRAYON', clue: 'Wax stick for coloring.' },
  { word: 'VOYAGE', clue: 'Long journey by sea.' },
  { word: 'COYOTE', clue: 'Wild howler of the American plains.' },
  { word: 'OXYGEN', clue: 'Gas we breathe to live.' },
  { word: 'GALAXY', clue: 'Spiral of a billion stars.' },
  { word: 'SHADOW', clue: 'Dark shape cast by blocked light.' },
  { word: 'WALLET', clue: 'Pocket folder for cash and cards.' },
  { word: 'BASKET', clue: 'Woven container with a handle.' },
  { word: 'MONKEY', clue: 'Tree-swinging banana lover.' },
  { word: 'POTATO', clue: 'Underground staple mashed or fried.' },
  { word: 'TOMATO', clue: 'Red fruit treated as a vegetable.' },
  { word: 'CHEESE', clue: 'Aged milk in wheels and wedges.' },
  { word: 'BOTTLE', clue: 'Glass container with a narrow neck.' },
  { word: 'PILLOW', clue: 'Soft cushion under a sleeping head.' },
  { word: 'SILVER', clue: 'Precious metal of second-place medals.' },
  { word: 'MAGNET', clue: 'It pulls iron toward itself.' },
  { word: 'PLANET', clue: 'World orbiting a star.' },
  { word: 'SUNSET', clue: 'Sky show when day ends.' },
  { word: 'DESERT', clue: 'Dry land of sand and cactus.' },
  { word: 'MEADOW', clue: 'Grassy field dotted with flowers.' },
  { word: 'PIGEON', clue: 'City bird cooing on statues.' },
  { word: 'SALMON', clue: 'Pink fish that swims upstream.' },
  { word: 'HELMET', clue: 'Hard hat that protects the head.' },
  { word: 'JACKET', clue: 'Light coat for cool evenings.' },
  { word: 'FALCON', clue: 'Fastest bird in a dive.' },
  { word: 'COFFEE', clue: 'Dark morning brew.' },
  { word: 'FABRIC', clue: 'Cloth woven from thread.' },
  { word: 'MUFFIN', clue: 'Small domed cake baked in a cup.' },
  { word: 'YOGURT', clue: 'Cultured milk eaten with a spoon.' },
  { word: 'VELVET', clue: 'Fabric with a soft deep pile.' },
  { word: 'BREEZE', clue: 'Gentle wind on a warm day.' },
  { word: 'SPHINX', clue: 'Riddle-posing lion of Egyptian myth.' },
  { word: 'SUMMER', clue: 'Season of long sunny days.' },
  { word: 'AUTUMN', clue: 'Season when the leaves fall.' },
  { word: 'FLOWER', clue: 'Blooming part of a plant.' },
  { word: 'TUNNEL', clue: 'Passage bored through a mountain.' },
  { word: 'NEEDLE', clue: 'Slender pin with an eye for thread.' },
  { word: 'DONKEY', clue: 'Long-eared beast of burden.' },
  { word: 'TEAPOT', clue: 'Spouted vessel for brewing leaves.' },
  { word: 'INDIGO', clue: 'Deep blue dye between blue and violet.' },
  { word: 'BANANA', clue: 'Curved yellow fruit in a peel.' },
  // ---- 7 letters ----
  { word: 'RAINBOW', clue: 'Colored arc after the rain.' },
  { word: 'VOLCANO', clue: 'Mountain that erupts.' },
  { word: 'PUMPKIN', clue: 'Orange squash carved in October.' },
  { word: 'BLANKET', clue: 'Warm layer spread on a bed.' },
  { word: 'KITCHEN', clue: 'Room where meals are cooked.' },
  { word: 'LANTERN', clue: 'Portable lamp with a handle.' },
  { word: 'COMPASS', clue: 'Pocket tool that finds north.' },
  { word: 'DOLPHIN', clue: 'Playful marine mammal that clicks.' },
  { word: 'GIRAFFE', clue: 'Tallest animal on Earth.' },
  { word: 'HARVEST', clue: 'Gathering of ripe crops.' },
  { word: 'ICEBERG', clue: 'Floating ice mostly hidden underwater.' },
  { word: 'JOURNEY', clue: 'Long trip from place to place.' },
  { word: 'LIBRARY', clue: 'Quiet building full of books.' },
  { word: 'MACHINE', clue: 'Device with moving parts and a job.' },
  { word: 'OCTOPUS', clue: 'Eight-armed sea creature.' },
  { word: 'PENGUIN', clue: 'Tuxedoed bird that cannot fly.' },
  { word: 'ROOSTER', clue: 'Farm bird that crows at dawn.' },
  { word: 'SHELTER', clue: 'Place of refuge from the weather.' },
  { word: 'THUNDER', clue: 'Rumble that follows lightning.' },
  { word: 'VILLAGE', clue: 'Small cluster of country homes.' },
  { word: 'WHISTLE', clue: 'Shrill blast from pursed lips.' },
  { word: 'HISTORY', clue: 'The study of the past.' },
  { word: 'VINEGAR', clue: 'Sour liquid in salad dressing.' },
  { word: 'MAILBOX', clue: 'Where letters wait at the curb.' },
  { word: 'EXPRESS', clue: 'Fast train that skips stations.' },
  { word: 'TEXTURE', clue: 'How a surface feels to the touch.' },
  { word: 'DIAMOND', clue: 'Hardest gem of all.' },
  { word: 'FEATHER', clue: "Light plume from a bird's wing." },
  { word: 'GLACIER', clue: 'Slow river of ancient ice.' },
  { word: 'HAMMOCK', clue: 'Net bed slung between two trees.' },
  { word: 'LULLABY', clue: 'Soft song that brings sleep.' },
  { word: 'MUSTARD', clue: 'Yellow paste on a hot dog.' },
  { word: 'ORCHARD', clue: 'Field of fruit trees.' },
  { word: 'PYRAMID', clue: 'Pointed tomb of the pharaohs.' },
  { word: 'BALCONY', clue: 'Railed platform off an upper room.' },
  { word: 'CABBAGE', clue: 'Leafy head chopped into coleslaw.' },
  { word: 'CARAVAN', clue: 'Line of travelers crossing the desert.' },
  { word: 'CHIMNEY', clue: "Smoke's exit above the fireplace." },
  { word: 'CRICKET', clue: 'Chirping insect of summer nights.' },
  { word: 'CUSHION', clue: 'Soft pad on a sofa.' },
  { word: 'JASMINE', clue: 'Fragrant white blossom for tea.' },
  { word: 'JAVELIN', clue: 'Spear thrown in athletics.' },
  { word: 'AVOCADO', clue: 'Green fruit mashed into guacamole.' },
  { word: 'BISCUIT', clue: 'Crisp little baked treat.' },
  { word: 'DUSTPAN', clue: 'Flat scoop partnered with a broom.' },
  { word: 'GONDOLA', clue: 'Slim boat poled through Venice.' },
  { word: 'HIGHWAY', clue: 'Broad road between cities.' },
  { word: 'MONSOON', clue: 'Season of heavy tropical rain.' },
  { word: 'NECKTIE', clue: 'Knotted strip worn with a suit.' },
  { word: 'OREGANO', clue: 'Herb sprinkled over pizza.' },
  { word: 'PELICAN', clue: 'Big-billed bird with a pouch.' },
  { word: 'SAWDUST', clue: 'Powder left behind by a carpenter.' },
  { word: 'UNICORN', clue: 'One-horned horse of fairy tales.' },
  { word: 'BLOSSOM', clue: 'Flower opening in spring.' },
  { word: 'CENTURY', clue: 'One hundred years.' },
  { word: 'EVENING', clue: 'Time between sunset and night.' },
  { word: 'FORTUNE', clue: 'Great wealth, or fate foretold.' },
  { word: 'HORIZON', clue: 'Line where sky meets land.' },
  { word: 'MINERAL', clue: 'Natural substance mined from rock.' },
  { word: 'POPCORN', clue: 'Exploded kernels at the movies.' },
  { word: 'RAVIOLI', clue: 'Stuffed pasta pockets.' },
  { word: 'TRUMPET', clue: 'Brass horn with three valves.' },
  { word: 'VANILLA', clue: 'Flavor from a tropical orchid pod.' },
  { word: 'WEEKEND', clue: 'Saturday and Sunday together.' },
  { word: 'EMERALD', clue: 'Vivid green gemstone.' },
  { word: 'OATMEAL', clue: 'Hot cereal of rolled grains.' },
  { word: 'LADYBUG', clue: 'Red beetle with black dots.' },
  { word: 'PARSNIP', clue: 'Pale cousin of the carrot.' },
  // ---- 8 letters ----
  { word: 'ELEPHANT', clue: 'Giant with a trunk and tusks.' },
  { word: 'LAVENDER', clue: 'Purple herb famous for its scent.' },
  { word: 'NOTEBOOK', clue: 'Bound pages for jotting ideas.' },
  { word: 'PORRIDGE', clue: 'Hot oats in a breakfast bowl.' },
  { word: 'SCISSORS', clue: 'Two blades that cut paper.' },
  { word: 'TREASURE', clue: 'Chest of gold on a pirate map.' },
  { word: 'UMBRELLA', clue: 'Canopy carried in the rain.' },
  { word: 'DAFFODIL', clue: 'Trumpet-shaped flower of early spring.' },
  { word: 'ENVELOPE', clue: 'Paper sleeve for a letter.' },
  { word: 'FESTIVAL', clue: 'Big celebration with music and food.' },
  { word: 'FOUNTAIN', clue: 'Jet of water in a plaza.' },
  { word: 'HEDGEHOG', clue: 'Small spiny garden visitor.' },
  { word: 'KANGAROO', clue: 'Bounding marsupial with a pouch.' },
  { word: 'MAGAZINE', clue: 'Glossy periodical on a rack.' },
  { word: 'MEDICINE', clue: 'What the doctor prescribes.' },
  { word: 'PAINTING', clue: 'Framed picture made with brushes.' },
  { word: 'RAINCOAT', clue: 'Waterproof layer for wet days.' },
  { word: 'REINDEER', clue: 'Antlered puller of a famous sleigh.' },
  { word: 'SAPPHIRE', clue: 'Deep blue precious stone.' },
  { word: 'SEAHORSE', clue: 'Upright fish with a curled tail.' },
  { word: 'SHOULDER', clue: 'Joint between arm and neck.' },
  { word: 'SKELETON', clue: "The body's frame of bones." },
  { word: 'SQUIRREL', clue: 'Bushy-tailed hoarder of acorns.' },
  { word: 'TORTOISE', clue: 'Slow, steady shelled walker.' },
  { word: 'SUITCASE', clue: 'Packed box with a handle for trips.' },
  { word: 'CALENDAR', clue: "Grid of the year's days." },
  { word: 'DINOSAUR', clue: 'Ancient reptile known from fossils.' },
  { word: 'DOORBELL', clue: 'Button that chimes at the entrance.' },
  { word: 'FIREWOOD', clue: 'Split logs stacked for the stove.' },
  { word: 'FLAMINGO', clue: 'Pink bird standing on one leg.' },
  { word: 'HAZELNUT', clue: 'Round nut in chocolate spreads.' },
  { word: 'LOLLIPOP', clue: 'Candy on a stick.' },
  { word: 'MUSHROOM', clue: 'Umbrella-shaped fungus.' },
  { word: 'SNOWBALL', clue: 'Packed handful of winter.' },
  { word: 'STAIRWAY', clue: 'Flight of steps between floors.' },
  { word: 'TELEGRAM', clue: 'Urgent message sent by wire.' },
  { word: 'BACKPACK', clue: 'Bag carried on both shoulders.' },
  { word: 'CHESTNUT', clue: 'Glossy nut roasted in winter.' },
  { word: 'DAYBREAK', clue: 'First light of the morning.' },
  { word: 'GARGOYLE', clue: 'Stone monster on a cathedral ledge.' },
  { word: 'MOLASSES', clue: 'Thick dark syrup from sugarcane.' },
  // ---- 9–10 letters ----
  { word: 'BUTTERFLY', clue: 'Winged insect born from a caterpillar.' },
  { word: 'CROCODILE', clue: 'Toothy reptile lurking in rivers.' },
  { word: 'FIREPLACE', clue: 'Hearth that warms the living room.' },
  { word: 'GREENHOUSE', clue: 'Glass house for growing plants.' },
  { word: 'HELICOPTER', clue: 'Aircraft with spinning rotor blades.' },
  { word: 'LIGHTHOUSE', clue: 'Coastal tower warning ships away.' },
  { word: 'MICROSCOPE', clue: 'Instrument that magnifies the tiny.' },
  { word: 'ORCHESTRA', clue: 'Full ensemble led by a conductor.' },
  { word: 'PARACHUTE', clue: 'Silk canopy for a safe fall.' },
  { word: 'PINEAPPLE', clue: 'Spiky tropical fruit with a crown.' },
  { word: 'PORCUPINE', clue: 'Rodent bristling with quills.' },
  { word: 'RASPBERRY', clue: 'Red berry built of tiny beads.' },
  { word: 'SAXOPHONE', clue: 'Curved brass voice of jazz.' },
  { word: 'SCARECROW', clue: 'Straw figure guarding the field.' },
  { word: 'SUBMARINE', clue: 'Vessel that travels underwater.' },
  { word: 'TELESCOPE', clue: 'Tube that brings the stars closer.' },
  { word: 'WATERMELON', clue: 'Huge green fruit, pink inside.' },
  { word: 'XYLOPHONE', clue: 'Wooden bars struck with mallets.' },
  { word: 'BLUEPRINT', clue: "Architect's detailed plan." },
  { word: 'CHAMELEON', clue: 'Lizard that changes color.' },
  { word: 'DANDELION', clue: 'Weed that turns into a wish.' },
  { word: 'DRAGONFLY', clue: 'Darting insect with glassy wings.' },
  { word: 'EVERGREEN', clue: 'Tree that never loses its needles.' },
  { word: 'HURRICANE', clue: 'Spinning storm with an eye.' },
  { word: 'JELLYFISH', clue: 'Transparent drifter that stings.' },
  { word: 'LABYRINTH', clue: 'Maze with a legendary monster.' },
  { word: 'MOONLIGHT', clue: 'Silver glow on a clear night.' },
  { word: 'AVALANCHE', clue: 'Snow thundering down a mountain.' },
  { word: 'PEPPERMINT', clue: 'Cool flavor of candy canes.' },
  { word: 'QUICKSAND', clue: 'Ground that swallows the unwary.' },
  { word: 'RIVERBANK', clue: "Ground along the water's edge." },
  { word: 'STARLIGHT', clue: 'Faint shine from distant suns.' },
  { word: 'TABLESPOON', clue: 'Large measure in a recipe.' },
  { word: 'VEGETABLE', clue: 'Edible plant on the dinner plate.' },
  { word: 'WHIRLPOOL', clue: 'Spinning funnel of water.' },
  { word: 'CARTWHEEL', clue: 'Sideways handspring.' },
  { word: 'BLACKBOARD', clue: 'Dark panel written on with chalk.' },
  { word: 'GRAPEVINE', clue: 'Climbing plant heavy with fruit clusters.' },
  { word: 'NAVIGATOR', clue: 'Crew member who plots the course.' },
  { word: 'BUTTERCUP', clue: 'Glossy yellow wildflower.' },
  { word: 'CATHEDRAL', clue: 'Grand church with soaring spires.' },
  { word: 'ASTRONAUT', clue: 'Traveler in a spacesuit.' },
  { word: 'BUMBLEBEE', clue: 'Fuzzy striped pollinator.' },
  { word: 'CROSSROAD', clue: 'Where two ways meet.' },
  { word: 'DRIFTWOOD', clue: 'Sea-smoothed timber on the beach.' },
  { word: 'HONEYCOMB', clue: 'Hexagon storage built by bees.' },
  { word: 'LIMESTONE', clue: 'Sedimentary rock of ancient shells.' },
  { word: 'ORANGUTAN', clue: 'Red-haired ape of Borneo.' },
  { word: 'PAPERBACK', clue: 'Softcover edition of a book.' },
  { word: 'SNOWFLAKE', clue: 'Six-sided crystal, never twice alike.' },
  { word: 'UNDERDOG', clue: 'Competitor nobody expects to win.' },
  { word: 'VOLLEYBALL', clue: 'Net game played with the hands.' },
  { word: 'WATERFALL', clue: 'River plunging over a cliff.' }
];

export const HIDDEN_ANSWERS: Record<Difficulty, HiddenAnswer[]> = {
  easy: [
    { answer: 'MORNING SUNSHINE', clue: 'What pours through the window on a bright early day.' },
    { answer: 'BIRTHDAY PRESENT', clue: 'Wrapped surprise handed over once a year.' },
    { answer: 'DANCING PENGUINS', clue: 'Tuxedoed birds busting a move.' },
    { answer: 'CHOCOLATE MOUSSE', clue: 'Airy cocoa dessert served in a glass.' },
    { answer: 'SUMMER VACATIONS', clue: "School's-out trips in the hottest season." },
    { answer: 'GOLDEN RETRIEVER', clue: 'Famously friendly fetch-loving dog.' },
    { answer: 'GRAND ADVENTURES', clue: 'Epic journeys into the unknown.' },
    { answer: 'MAGICAL KINGDOMS', clue: 'Enchanted realms of fairy tales.' },
    { answer: 'WHISPERING WINDS', clue: 'Soft voices of a gentle breeze.' }
  ],
  medium: [
    { answer: 'MYSTERIOUS ISLAND', clue: 'Uncharted land where strange things happen.' },
    { answer: 'SCIENTIFIC METHOD', clue: 'Hypothesis, experiment, conclusion.' },
    { answer: 'BREAKFAST SANDWICH', clue: 'Egg and cheese stacked to start the day.' },
    { answer: 'MOUNTAIN CLIMBING', clue: 'Sport of ropes, ridges and summits.' },
    { answer: 'FLOATING LANTERNS', clue: 'Paper lights drifting into the night sky.' },
    { answer: 'MIDNIGHT ADVENTURE', clue: 'Escapade that begins when the clock strikes twelve.' },
    { answer: 'CRYSTAL CHANDELIER', clue: 'Sparkling fixture hanging in a ballroom.' },
    { answer: 'ENCHANTED FORESTS', clue: 'Woods under a fairy-tale spell.' }
  ],
  hard: [
    { answer: 'TROPICAL RAINFOREST', clue: 'Steamy jungle bursting with life.' },
    { answer: 'UNDERGROUND STATIONS', clue: 'Subway stops beneath the city.' },
    { answer: 'EXTRAORDINARY THINGS', clue: 'Matters far beyond the ordinary.' },
    { answer: 'SPECTACULAR FIREWORKS', clue: 'Dazzling explosions lighting the new year.' },
    { answer: 'IMAGINARY CREATURES', clue: 'Beasts that exist only in the mind.' },
    { answer: 'PROFESSIONAL ATHLETES', clue: 'People paid to play their sport.' },
    { answer: 'PHILOSOPHICAL DEBATES', clue: 'Long arguments about truth and meaning.' }
  ]
};

/** Row-word length band per difficulty (more columns as difficulty rises). */
export const LEN_BAND: Record<Difficulty, [number, number]> = {
  easy: [4, 6],
  medium: [5, 8],
  hard: [6, 10]
};

/** Preferred cap on where the hidden letter may sit inside a row word. */
export const IDX_CAP: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCryptoPuzzle(difficulty: Difficulty): CryptoPuzzle {
  const pickList = HIDDEN_ANSWERS[difficulty];
  const hidden = pickList[Math.floor(Math.random() * pickList.length)];
  const letters = hidden.answer.replace(/ /g, '').split('');
  const [lo, hi] = LEN_BAND[difficulty];
  const cap = IDX_CAP[difficulty];
  const used = new Set<string>();

  const rows: CryptoRowDef[] = letters.map((letter) => {
    const inBand = (e: BankEntry) => e.word.length >= lo && e.word.length <= hi;
    const nearStart = (e: BankEntry) => [...e.word].some((c, i) => c === letter && i <= cap);
    // Prefer hosts where the letter sits within the column cap (keeps the
    // board narrow); relax the cap, the band, then the used-set, in order.
    let pool = WORD_BANK.filter((e) => !used.has(e.word) && inBand(e) && nearStart(e));
    if (pool.length === 0)
      pool = WORD_BANK.filter((e) => !used.has(e.word) && inBand(e) && e.word.includes(letter));
    if (pool.length === 0) pool = WORD_BANK.filter((e) => !used.has(e.word) && e.word.includes(letter));
    if (pool.length === 0) pool = WORD_BANK.filter((e) => e.word.includes(letter));
    const entry = pool[Math.floor(Math.random() * pool.length)];
    used.add(entry.word);
    const indexes = [...entry.word].flatMap((c, i) => (c === letter ? [i] : []));
    const capped = indexes.filter((i) => i <= cap);
    const hiddenIndex = capped.length
      ? capped[Math.floor(Math.random() * capped.length)]
      : indexes[0];
    return { word: entry.word, clue: entry.clue, hiddenIndex };
  });

  const col = Math.max(...rows.map((r) => r.hiddenIndex));
  const cols = col + Math.max(...rows.map((r) => r.word.length - r.hiddenIndex));

  const distinct = [...new Set(rows.flatMap((r) => r.word.split('')))];
  const order = shuffle([...Array(CIPHER_GLYPH_COUNT).keys()]);
  const glyphOf = Object.fromEntries(distinct.map((c, i) => [c, order[i]]));

  const space = hidden.answer.indexOf(' ');
  return {
    clue: hidden.clue,
    answer: hidden.answer,
    rows,
    groupBreak: space === -1 ? null : space,
    glyphOf,
    col,
    cols
  };
}

/** Static integrity checks for `npm run validate`. */
export function validateCryptoContent(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const e of WORD_BANK) {
    if (!/^[A-Z]{4,10}$/.test(e.word)) errors.push(`bank word "${e.word}" must be 4–10 uppercase letters`);
    if (seen.has(e.word)) errors.push(`bank word "${e.word}" is duplicated`);
    seen.add(e.word);
    if (e.clue.trim().length < 8) errors.push(`bank word "${e.word}" has a too-short clue`);
  }

  const ANSWER_LEN: Record<Difficulty, [number, number]> = {
    easy: [15, 15],
    medium: [16, 17],
    hard: [18, 20]
  };
  for (const difficulty of Object.keys(HIDDEN_ANSWERS) as Difficulty[]) {
    const [lo, hi] = LEN_BAND[difficulty];
    const cap = IDX_CAP[difficulty];
    const [minLen, maxLen] = ANSWER_LEN[difficulty];
    for (const h of HIDDEN_ANSWERS[difficulty]) {
      if (!/^[A-Z]+( [A-Z]+)?$/.test(h.answer)) {
        errors.push(`${difficulty} answer "${h.answer}" must be one or two uppercase words`);
        continue;
      }
      const letters = h.answer.replace(/ /g, '');
      if (letters.length < minLen || letters.length > maxLen) {
        errors.push(
          `${difficulty} answer "${h.answer}" has ${letters.length} letters (want ${minLen}–${maxLen})`
        );
      }
      // Every letter needs enough distinct in-band host words (with the
      // letter reachable at index ≤ cap) to fill all its rows plus margin,
      // so random generation can never dead-end.
      const counts = new Map<string, number>();
      for (const c of letters) counts.set(c, (counts.get(c) ?? 0) + 1);
      for (const [c, n] of counts) {
        const hosts = WORD_BANK.filter(
          (e) =>
            e.word.length >= lo &&
            e.word.length <= hi &&
            [...e.word].some((w, i) => w === c && i <= cap)
        ).length;
        if (hosts < n + 2) {
          errors.push(
            `${difficulty} answer "${h.answer}": letter ${c}×${n} has only ${hosts} host words in band ${lo}–${hi}`
          );
        }
      }
    }
  }
  return errors;
}
