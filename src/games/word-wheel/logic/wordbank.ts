import type { Difficulty } from '../../../platform/types';

/**
 * Curated bank of common English words (3–9 letters, uppercase) that powers
 * the random Word Hunt mode. A hunt's target list is EVERY bank word that
 * can be spelled from the puzzle letters and contains the center letter —
 * so submissions are only judged against words the player could know are
 * in play. Keep entries common and family-friendly; `npm run validate`
 * re-checks the bank and test-generates hunts after edits.
 */
export const WORD_BANK: string[] = [
  // --- 3 letters ---
  'ACE', 'ACT', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALE', 'ANT', 'APE', 'ARC', 'ARE',
  'ARM', 'ART', 'ASH', 'ATE', 'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED', 'BEE', 'BET',
  'BIG', 'BIN', 'BIT', 'BOX', 'BOY', 'BUS', 'BUT', 'CAB', 'CAN', 'CAP', 'CAR', 'CAT',
  'COG', 'COP', 'COT', 'COW', 'CRY', 'CUE', 'CUP', 'CUT', 'DAY', 'DEN', 'DEW', 'DIE',
  'DIG', 'DIM', 'DIP', 'DOG', 'DOT', 'DRY', 'DUE', 'EAR', 'EAT', 'EGG', 'EGO', 'END',
  'ERA', 'EYE', 'FAN', 'FAR', 'FAT', 'FEW', 'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOG',
  'FOR', 'FOX', 'FUN', 'FUR', 'GAP', 'GAS', 'GEM', 'GET', 'GIN', 'GOT', 'GUM', 'GUN',
  'GUT', 'HAM', 'HAS', 'HAT', 'HEN', 'HER', 'HID', 'HIM', 'HIP', 'HIT', 'HOT', 'HUE',
  'HUG', 'HUT', 'ICE', 'INK', 'ION', 'ITS', 'JAM', 'JAR', 'JAW', 'JET', 'JOB', 'JOY',
  'KEY', 'KID', 'KIN', 'KIT', 'LAB', 'LAP', 'LAW', 'LAY', 'LEG', 'LET', 'LID', 'LIE',
  'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'MAD', 'MAN', 'MAP', 'MAT', 'MEN', 'MET', 'MIX',
  'MUD', 'MUG', 'NAP', 'NET', 'NEW', 'NOD', 'NOR', 'NOT', 'NOW', 'NUT', 'OAK', 'OAR',
  'ODD', 'OIL', 'OLD', 'ONE', 'ORE', 'OUR', 'OUT', 'OWL', 'OWN', 'PAD', 'PAN', 'PAR',
  'PAT', 'PAW', 'PEA', 'PEG', 'PEN', 'PET', 'PIE', 'PIG', 'PIN', 'PIT', 'POT', 'PRO',
  'PUB', 'PUT', 'RAG', 'RAM', 'RAN', 'RAT', 'RAW', 'RAY', 'RED', 'RIB', 'RID', 'RIM',
  'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUN', 'RUT', 'SAD', 'SAG', 'SAT',
  'SAW', 'SAY', 'SEA', 'SEE', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR', 'SIT',
  'SIX', 'SKY', 'SLY', 'SON', 'SPA', 'SPY', 'SUM', 'SUN', 'TAB', 'TAG', 'TAN', 'TAP',
  'TAR', 'TEA', 'TEN', 'THE', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOP', 'TOW', 'TOY',
  'TRY', 'TUB', 'TWO', 'URN', 'USE', 'VAN', 'VET', 'VIA', 'WAR', 'WAS', 'WAX', 'WAY',
  'WEB', 'WET', 'WHO', 'WIG', 'WIN', 'WIT', 'WON', 'YES', 'YET', 'ZOO',
  // --- 4 letters ---
  'ABLE', 'ACHE', 'ACID', 'AGED', 'ALSO', 'AREA', 'ARMY', 'AUNT', 'BAKE', 'BALL',
  'BAND', 'BANK', 'BARE', 'BARN', 'BASE', 'BATH', 'BEAM', 'BEAN', 'BEAR', 'BEAT',
  'BELL', 'BELT', 'BEND', 'BENT', 'BEST', 'BIKE', 'BIRD', 'BITE', 'BLUE', 'BOAT',
  'BOLD', 'BOLT', 'BONE', 'BORE', 'BORN', 'BOTH', 'BOWL', 'BURN', 'BUSY', 'CAGE',
  'CAKE', 'CALM', 'CAME', 'CAMP', 'CARD', 'CARE', 'CART', 'CASE', 'CASH', 'CAST',
  'CAVE', 'CENT', 'CHAT', 'CHIN', 'CITY', 'CLAM', 'CLAN', 'CLAP', 'CLAY', 'CLIP',
  'CLUB', 'CLUE', 'COAL', 'COAT', 'CODE', 'COIL', 'COIN', 'COLD', 'COMB', 'COME',
  'CONE', 'COOK', 'COOL', 'COPE', 'CORD', 'CORE', 'CORN', 'COST', 'COZY', 'CREW',
  'CROP', 'CUBE', 'CURE', 'CURL', 'DARE', 'DARK', 'DART', 'DATE', 'DAWN', 'DEAL',
  'DEAR', 'DEBT', 'DECK', 'DEEP', 'DEER', 'DENT', 'DESK', 'DIAL', 'DICE', 'DIET',
  'DIRT', 'DISH', 'DIVE', 'DOME', 'DONE', 'DOOR', 'DOSE', 'DOWN', 'DRAG', 'DRAW',
  'DREW', 'DRIP', 'DROP', 'DRUM', 'DUST', 'DUTY', 'EACH', 'EARN', 'EASE', 'EAST',
  'EDGE', 'ELSE', 'EVEN', 'EVER', 'EXIT', 'FACE', 'FACT', 'FADE', 'FAIR', 'FALL',
  'FARM', 'FAST', 'FATE', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT',
  'FERN', 'FILE', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FIVE',
  'FLAG', 'FLAT', 'FLEW', 'FLIP', 'FLOW', 'FOAM', 'FOLD', 'FOND', 'FOOD', 'FOOT',
  'FORE', 'FORK', 'FORM', 'FORT', 'FOUR', 'FREE', 'FROG', 'FROM', 'FUEL', 'FULL',
  'GAIN', 'GAME', 'GATE', 'GAVE', 'GEAR', 'GIFT', 'GIRL', 'GIVE', 'GLAD', 'GLOW',
  'GLUE', 'GOAL', 'GOAT', 'GOLD', 'GONE', 'GOOD', 'GRAB', 'GRAY', 'GREW', 'GRID',
  'GRIN', 'GRIP', 'GROW', 'HAIR', 'HALF', 'HALL', 'HAND', 'HANG', 'HARD', 'HARM',
  'HATE', 'HAVE', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HELD', 'HELP', 'HERD',
  'HERE', 'HERO', 'HIDE', 'HIGH', 'HIKE', 'HILL', 'HINT', 'HIRE', 'HOLD', 'HOLE',
  'HOME', 'HOPE', 'HORN', 'HOSE', 'HOST', 'HOUR', 'HUGE', 'HUNT', 'HURT', 'ICON',
  'IDEA', 'INCH', 'INTO', 'IRON', 'ITEM', 'JOIN', 'JOKE', 'JUMP', 'JUST', 'KEEN',
  'KEEP', 'KEPT', 'KIND', 'KING', 'KITE', 'KNEE', 'KNEW', 'KNOW', 'LACE', 'LAID',
  'LAKE', 'LAMP', 'LAND', 'LANE', 'LAST', 'LATE', 'LAWN', 'LAZY', 'LEAD', 'LEAF',
  'LEAN', 'LEAP', 'LEFT', 'LEND', 'LENS', 'LESS', 'LIFE', 'LIFT', 'LIKE', 'LIME',
  'LINE', 'LINK', 'LION', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAN', 'LOCK', 'LONG',
  'LOOK', 'LOOP', 'LORD', 'LOSE', 'LOSS', 'LOST', 'LOUD', 'LOVE', 'LUCK', 'MADE',
  'MAIL', 'MAIN', 'MAKE', 'MALE', 'MANE', 'MANY', 'MARE', 'MARK', 'MASK', 'MAST',
  'MATE', 'MAZE', 'MEAL', 'MEAN', 'MEAT', 'MEET', 'MELT', 'MENU', 'MICE', 'MILD',
  'MILE', 'MILK', 'MIND', 'MINE', 'MINT', 'MIST', 'MODE', 'MOLE', 'MOOD', 'MOON',
  'MORE', 'MOST', 'MOTH', 'MOVE', 'MUCH', 'MUST', 'NAME', 'NEAR', 'NEAT', 'NECK',
  'NEED', 'NEST', 'NEWS', 'NEXT', 'NICE', 'NINE', 'NONE', 'NOON', 'NOSE', 'NOTE',
  'OBEY', 'ONCE', 'ONLY', 'ONTO', 'OPEN', 'ORAL', 'OVAL', 'OVEN', 'OVER', 'PACE',
  'PACK', 'PAGE', 'PAID', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PARK', 'PART', 'PAST',
  'PATH', 'PEAK', 'PEAR', 'PEAS', 'PELT', 'PEST', 'PICK', 'PILE', 'PINE', 'PINK',
  'PIPE', 'PLAN', 'PLAY', 'PLOT', 'PLUG', 'PLUS', 'POEM', 'POET', 'POLE', 'POND',
  'PONY', 'POOL', 'PORT', 'POSE', 'POST', 'POUR', 'PRAY', 'PULL', 'PUMP', 'PURE',
  'PUSH', 'RACE', 'RAGE', 'RAIL', 'RAIN', 'RANG', 'RANK', 'RARE', 'RATE', 'READ',
  'REAL', 'REAP', 'REAR', 'RENT', 'REST', 'RICE', 'RICH', 'RIDE', 'RING', 'RIPE',
  'RISE', 'RISK', 'ROAD', 'ROAM', 'ROAR', 'ROBE', 'ROCK', 'RODE', 'ROLE', 'ROLL',
  'ROOF', 'ROOM', 'ROOT', 'ROPE', 'ROSE', 'RUDE', 'RUIN', 'RULE', 'RUSH', 'RUST',
  'SAFE', 'SAID', 'SAIL', 'SALE', 'SALT', 'SAME', 'SAND', 'SANG', 'SAVE', 'SEAL',
  'SEAT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEND', 'SENT', 'SHED',
  'SHIP', 'SHOE', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SICK', 'SIDE', 'SIGN', 'SILK',
  'SING', 'SINK', 'SITE', 'SIZE', 'SKIN', 'SKIP', 'SLAM', 'SLED', 'SLIP', 'SLOW',
  'SNAP', 'SNOW', 'SOAP', 'SOAR', 'SOCK', 'SODA', 'SOFT', 'SOIL', 'SOLD', 'SOLE',
  'SOME', 'SONG', 'SOON', 'SORE', 'SORT', 'SOUL', 'SOUP', 'SOUR', 'SPAN', 'SPIN',
  'SPOT', 'STAR', 'STAY', 'STEM', 'STEP', 'STIR', 'STOP', 'SUCH', 'SUIT', 'SURE',
  'SWIM', 'TAIL', 'TAKE', 'TALE', 'TALK', 'TALL', 'TAME', 'TANK', 'TAPE', 'TASK',
  'TEAM', 'TEAR', 'TELL', 'TENT', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THEM',
  'THEN', 'THIN', 'THIS', 'TIDE', 'TIDY', 'TILE', 'TIME', 'TINY', 'TIRE', 'TOAD',
  'TOLD', 'TONE', 'TOOK', 'TOOL', 'TORE', 'TORN', 'TOUR', 'TOWN', 'TRAP', 'TRAY',
  'TREE', 'TRIM', 'TRIP', 'TRUE', 'TUBE', 'TUNE', 'TURN', 'TWIN', 'TYPE', 'UNIT',
  'UPON', 'USED', 'USER', 'VAST', 'VERY', 'VIEW', 'VINE', 'VOTE', 'WAGE', 'WAIT',
  'WAKE', 'WALK', 'WALL', 'WANT', 'WARM', 'WARN', 'WASH', 'WAVE', 'WEAK', 'WEAR',
  'WEEK', 'WELL', 'WENT', 'WERE', 'WEST', 'WHAT', 'WHEN', 'WIDE', 'WIFE', 'WILD',
  'WILL', 'WIND', 'WINE', 'WING', 'WIRE', 'WISE', 'WISH', 'WITH', 'WOLF', 'WOOD',
  'WOOL', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WRAP', 'YARD', 'YARN', 'YEAR',
  'ZERO', 'ZONE',
  // --- 5 letters ---
  'ABOUT', 'ABOVE', 'ACTOR', 'AFTER', 'AGENT', 'AGREE', 'ALARM', 'ALERT', 'ALIVE',
  'ALLOW', 'ALONE', 'ALONG', 'ANGEL', 'ANGER', 'ANGLE', 'APPLE', 'APRON', 'ARENA',
  'ARGUE', 'ARISE', 'ASIDE', 'AWARE', 'BADGE', 'BAKER', 'BASIC', 'BEACH', 'BEARD',
  'BEAST', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BERRY', 'BIRTH', 'BLADE',
  'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEND', 'BLOCK', 'BOARD', 'BONUS', 'BRAIN',
  'BRAKE', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BRICK', 'BRIDE', 'BRIEF', 'BRING',
  'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUILD', 'BUNCH', 'BURST', 'CABIN', 'CABLE',
  'CANAL', 'CANDY', 'CARGO', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHARM',
  'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHOSE', 'CLAIM',
  'CLASS', 'CLEAN', 'CLEAR', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD', 'COACH',
  'COAST', 'COLOR', 'CORAL', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRANE', 'CRASH',
  'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CURVE', 'DAILY', 'DAIRY', 'DANCE',
  'DEALT', 'DEATH', 'DELAY', 'DEPTH', 'DIRTY', 'DOZEN', 'DRAIN', 'DRAMA', 'DREAM',
  'DRESS', 'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'EAGER', 'EAGLE', 'EARLY',
  'EARTH', 'EIGHT', 'ELDER', 'EMPTY', 'ENJOY', 'ENTER', 'EQUAL', 'ERROR', 'EVENT',
  'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAINT', 'FAITH', 'FALSE', 'FANCY', 'FAULT',
  'FEAST', 'FENCE', 'FIELD', 'FIFTH', 'FIGHT', 'FINAL', 'FIRST', 'FLAME', 'FLASH',
  'FLEET', 'FLESH', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FOCUS', 'FORCE',
  'FORGE', 'FORTH', 'FOUND', 'FRAME', 'FRESH', 'FRONT', 'FROST', 'FRUIT', 'GIANT',
  'GLASS', 'GLOBE', 'GLORY', 'GLOVE', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT',
  'GRAPE', 'GRASP', 'GRASS', 'GREAT', 'GREEN', 'GREET', 'GRIND', 'GROUP', 'GROVE',
  'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HABIT', 'HAPPY', 'HEARD', 'HEART', 'HEAVY',
  'HEDGE', 'HELLO', 'HONEY', 'HONOR', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'HUMOR',
  'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JOINT', 'JUICE', 'LABEL',
  'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEAST', 'LEAVE', 'LEGAL',
  'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LINEN', 'LIVER', 'LOCAL', 'LODGE', 'LOGIC',
  'LOOSE', 'LOWER', 'LOYAL', 'LUCKY', 'LUNCH', 'MAGIC', 'MAJOR', 'MAPLE', 'MARCH',
  'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDAL', 'MEDIA', 'MELON', 'MERCY', 'MERGE',
  'MERIT', 'METAL', 'METER', 'MIGHT', 'MINOR', 'MINUS', 'MODEL', 'MONEY', 'MONTH',
  'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NERVE', 'NEVER',
  'NIGHT', 'NOBLE', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN',
  'OFFER', 'OFTEN', 'ONION', 'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OUGHT', 'OUTER',
  'OWNER', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PASTE', 'PATCH', 'PAUSE', 'PEACE',
  'PEACH', 'PEARL', 'PEDAL', 'PETAL', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT',
  'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POLAR', 'PORCH',
  'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIZE', 'PROOF',
  'PROUD', 'PROVE', 'PUPIL', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADAR', 'RADIO',
  'RAISE', 'RANCH', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'REACT', 'READY', 'REALM',
  'REBEL', 'REIGN', 'RELAX', 'REPLY', 'RIDGE', 'RIGHT', 'RIVAL', 'RIVER', 'ROAST',
  'ROBIN', 'ROCKY', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SAINT',
  'SALAD', 'SAUCE', 'SCALE', 'SCARE', 'SCENE', 'SCOPE', 'SCORE', 'SCOUT', 'SENSE',
  'SERVE', 'SEVEN', 'SHADE', 'SHAKE', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEEP',
  'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHORE', 'SHORT',
  'SHOUT', 'SIGHT', 'SILLY', 'SINCE', 'SIREN', 'SKILL', 'SLEEP', 'SLICE', 'SLIDE',
  'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMOKE', 'SNAKE', 'SOLAR', 'SOLID',
  'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPEAK', 'SPEED',
  'SPELL', 'SPEND', 'SPICE', 'SPLIT', 'SPOKE', 'SPORT', 'SPRAY', 'STAGE', 'STAIR',
  'STAKE', 'STAMP', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP', 'STICK',
  'STILL', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW',
  'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUPER', 'SWEET', 'SWEPT', 'SWING', 'TABLE',
  'TASTE', 'TEACH', 'TEETH', 'THANK', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK',
  'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGER', 'TIGHT',
  'TIMER', 'TIRED', 'TITLE', 'TOAST', 'TODAY', 'TOKEN', 'TOOTH', 'TOPIC', 'TORCH',
  'TOTAL', 'TOUCH', 'TOUGH', 'TOWEL', 'TOWER', 'TRACE', 'TRACK', 'TRADE', 'TRAIL',
  'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRUCK', 'TRUST',
  'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNION', 'UNITE', 'UNTIL', 'UPPER', 'UPSET',
  'URBAN', 'USAGE', 'USUAL', 'VALUE', 'VIDEO', 'VISIT', 'VITAL', 'VOICE', 'WAGON',
  'WASTE', 'WATCH', 'WATER', 'WHALE', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHILE',
  'WHITE', 'WHOLE', 'WHOSE', 'WIDTH', 'WOMAN', 'WORLD', 'WORRY', 'WORSE', 'WORST',
  'WORTH', 'WOULD', 'WOUND', 'WRIST', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG',
  'YOUTH',
  // --- 6 letters ---
  'ACCEPT', 'ACTION', 'ADVICE', 'ANIMAL', 'ANSWER', 'ARTIST', 'ATTACK', 'AUTUMN',
  'BAKERY', 'BASKET', 'BATTLE', 'BEAUTY', 'BECOME', 'BEFORE', 'BEHIND', 'BELONG',
  'BETTER', 'BEYOND', 'BORDER', 'BOTTLE', 'BOTTOM', 'BRANCH', 'BREATH', 'BRIDGE',
  'BRIGHT', 'BROKEN', 'BUDGET', 'BUTTER', 'BUTTON', 'CAMERA', 'CANDLE', 'CARBON',
  'CAREER', 'CASTLE', 'CENTER', 'CHANCE', 'CHANGE', 'CHARGE', 'CHOICE', 'CHOOSE',
  'CHURCH', 'CIRCLE', 'CLEVER', 'CLIENT', 'CLOSET', 'COFFEE', 'COMMON', 'CORNER',
  'COTTON', 'COUPLE', 'COURSE', 'COUSIN', 'CREATE', 'CREDIT', 'CUSTOM', 'DAMAGE',
  'DANGER', 'DEBATE', 'DECADE', 'DECIDE', 'DEGREE', 'DELETE', 'DESERT', 'DESIGN',
  'DESIRE', 'DETAIL', 'DINNER', 'DIRECT', 'DOCTOR', 'DOUBLE', 'DRAGON', 'DURING',
  'EASILY', 'EATING', 'EFFORT', 'EITHER', 'ELEVEN', 'EMPIRE', 'ENERGY', 'ENGINE',
  'ENOUGH', 'ESCAPE', 'ESTATE', 'EXPAND', 'EXPERT', 'FABRIC', 'FAMILY', 'FAMOUS',
  'FATHER', 'FIGURE', 'FINGER', 'FINISH', 'FLIGHT', 'FLOWER', 'FOLLOW', 'FOREST',
  'FORGET', 'FORMAL', 'FRIEND', 'FROZEN', 'FUTURE', 'GARDEN', 'GATHER', 'GENTLE',
  'GLOBAL', 'GOLDEN', 'GROUND', 'GROWTH', 'GUITAR', 'HANDLE', 'HAPPEN', 'HARBOR',
  'HEALTH', 'HEIGHT', 'HIDDEN', 'HOLLOW', 'HONEST', 'HUNGRY', 'ISLAND', 'JUNGLE',
  'KETTLE', 'KITTEN', 'LADDER', 'LATEST', 'LAUNCH', 'LAWYER', 'LEADER', 'LEGEND',
  'LESSON', 'LETTER', 'LIKELY', 'LISTEN', 'LITTLE', 'LIVING', 'LONELY', 'LUXURY',
  'MAKING', 'MANAGE', 'MANNER', 'MARBLE', 'MARKET', 'MASTER', 'MATTER', 'MEADOW',
  'MEMBER', 'MEMORY', 'METHOD', 'MIDDLE', 'MINUTE', 'MIRROR', 'MODERN', 'MOMENT',
  'MONKEY', 'MOTHER', 'MOTION', 'MUSEUM', 'MYSELF', 'NATION', 'NATURE', 'NEARBY',
  'NEEDLE', 'NORMAL', 'NOTICE', 'NUMBER', 'OBJECT', 'OFFICE', 'ORANGE', 'ORIGIN',
  'OXYGEN', 'PACKET', 'PALACE', 'PARADE', 'PARENT', 'PARROT', 'PEBBLE',
  'PENCIL', 'PEOPLE', 'PEPPER', 'PERIOD', 'PERSON', 'PICKLE', 'PICNIC', 'PILLOW',
  'PLANET', 'PLEASE', 'PLENTY', 'POCKET', 'POLICE', 'POLICY', 'POTATO', 'PRETTY',
  'PRINCE', 'PUBLIC', 'PUZZLE', 'RABBIT', 'RATHER', 'REASON', 'RECENT', 'RECORD',
  'REDUCE', 'REGION', 'REMAIN', 'REMOTE', 'REPAIR', 'REPEAT', 'REPORT', 'RESCUE',
  'RESULT', 'RETURN', 'REVEAL', 'REVIEW', 'REWARD', 'RHYTHM', 'RIBBON', 'ROCKET',
  'ROTTEN', 'RUBBER', 'SADDLE', 'SAFETY', 'SALMON', 'SAMPLE', 'SCHOOL', 'SCREEN',
  'SEARCH', 'SEASON', 'SECOND', 'SECRET', 'SELECT', 'SENIOR', 'SHADOW', 'SHOWER',
  'SIGNAL', 'SILENT', 'SILVER', 'SIMPLE', 'SINGLE', 'SISTER', 'SMOOTH', 'SOCIAL',
  'SPIRIT', 'SPREAD', 'SPRING', 'SQUARE', 'STABLE', 'STREAM', 'STREET', 'STRING',
  'STRONG', 'STUDIO', 'SUDDEN', 'SUMMER', 'SUNSET', 'SUPPLY', 'SYSTEM', 'TALENT',
  'TARGET', 'TEMPLE', 'TENDER', 'THEORY', 'THIRTY', 'THREAD', 'THROAT', 'TICKET',
  'TIMBER', 'TISSUE', 'TOMATO', 'TRAVEL', 'TUNNEL', 'TURTLE', 'TWELVE', 'UNIQUE',
  'UNITED', 'USEFUL', 'VALLEY', 'VELVET', 'VIOLET', 'WALLET', 'WANDER', 'WEALTH',
  'WEIGHT', 'WINDOW', 'WINNER', 'WINTER', 'WISDOM', 'WITHIN', 'WONDER', 'WOODEN',
  'YELLOW',
  // --- 7 letters ---
  'ABILITY', 'ABSENCE', 'ACADEMY', 'ACCOUNT', 'ADVANCE', 'AGAINST', 'AIRPORT',
  'ALREADY', 'AMAZING', 'ANCIENT', 'ANOTHER', 'ANTIQUE', 'ANXIETY', 'ARRANGE',
  'ARTICLE', 'ATTEMPT', 'AVERAGE', 'BALANCE', 'BARGAIN', 'BATTERY', 'BEDROOM',
  'BELIEVE', 'BENEATH', 'BENEFIT', 'BETWEEN', 'BICYCLE', 'BLANKET', 'BROTHER',
  'CABINET', 'CAPITAL', 'CAPTAIN', 'CAPTURE', 'CAREFUL', 'CENTRAL', 'CENTURY',
  'CERTAIN', 'CHAPTER', 'CHARITY', 'CHICKEN', 'CIRCUIT', 'CLASSIC',
  'CLIMATE', 'COLLECT', 'COLLEGE', 'COMFORT', 'COMMAND', 'COMPANY', 'COMPARE',
  'COMPETE', 'CONCERT', 'CONNECT', 'CONTAIN', 'CONTENT', 'CONTEST', 'CONTROL',
  'COTTAGE', 'COUNCIL', 'COUNTRY', 'COURAGE', 'CRYSTAL', 'CULTURE', 'CURIOUS',
  'CURRENT', 'CUSHION', 'DELIVER', 'DESTINY', 'DEVELOP', 'DIAMOND', 'DISPLAY',
  'DOLPHIN', 'DRAWING', 'EASTERN', 'ECONOMY', 'EDITION', 'ELEGANT', 'EVENING',
  'EXAMPLE', 'EXPLAIN', 'EXPLORE', 'EXPRESS', 'FACTORY', 'FASHION', 'FEATURE',
  'FICTION', 'FIFTEEN', 'FINANCE', 'FOREVER', 'FORTUNE', 'FORWARD', 'FREEDOM',
  'GALLERY', 'GENERAL', 'GENUINE', 'GRAVITY', 'HARVEST', 'HEALTHY', 'HISTORY',
  'HOLIDAY', 'HUSBAND', 'IMAGINE', 'IMPROVE', 'INCLUDE', 'INSTALL',
  'INSTANT', 'INSTEAD', 'JOURNAL', 'JOURNEY', 'JUSTICE', 'KINGDOM',
  'KITCHEN', 'LANTERN', 'LEATHER', 'LIBRARY', 'MACHINE', 'MANAGER', 'MAXIMUM',
  'MEANING', 'MEASURE', 'MESSAGE', 'MINERAL', 'MIRACLE', 'MISSION', 'MIXTURE',
  'MONSTER', 'MORNING', 'MYSTERY', 'NATURAL', 'NETWORK', 'NOTHING', 'OCTOBER',
  'OPERATE', 'OPINION', 'ORGANIC', 'OUTSIDE', 'PACKAGE', 'PAINTER', 'PASSAGE',
  'PATTERN', 'PAYMENT', 'PERFECT', 'PERFORM', 'PICTURE', 'PLASTIC', 'POPULAR',
  'PRESENT', 'PRIMARY', 'PRIVATE', 'PROBLEM', 'PRODUCE', 'PROJECT', 'PROMISE',
  'PROTECT', 'PURPOSE', 'QUALITY', 'QUARTER', 'RAINBOW', 'REALITY', 'RECEIVE',
  'RECOVER', 'REGULAR', 'RESPECT', 'RESTORE', 'ROUTINE', 'SCIENCE', 'SERIOUS',
  'SERVICE', 'SEVENTY', 'SHELTER', 'SILENCE', 'SOCIETY', 'SOLDIER', 'SPECIAL',
  'STATION', 'STOMACH', 'STRANGE', 'STRETCH', 'STUDENT', 'SUBJECT', 'SUCCESS',
  'SUPPORT', 'SUPPOSE', 'SURFACE', 'SURVIVE', 'TEACHER', 'THEATER', 'THOUGHT',
  'THUNDER', 'TONIGHT', 'TRAFFIC', 'TROUBLE', 'VEHICLE', 'VENTURE', 'VICTORY',
  'VILLAGE', 'VINTAGE', 'VISITOR', 'VOLCANO', 'WEATHER', 'WEEKEND', 'WELCOME',
  'WESTERN', 'WHISPER', 'WITNESS',
  // --- 8 letters ---
  'ABSOLUTE', 'ACCIDENT', 'ACTIVITY', 'AIRPLANE', 'ANNOUNCE', 'APPROACH',
  'ATTITUDE', 'BIRTHDAY', 'BUILDING', 'BUSINESS', 'CALENDAR', 'CAMPAIGN',
  'CAPACITY', 'CATEGORY', 'CHAMPION', 'CHILDREN', 'CLOTHING', 'COMPLETE',
  'COMPUTER', 'CONSIDER', 'CONTINUE', 'CREATIVE', 'CREATURE', 'CURRENCY',
  'CUSTOMER', 'DAUGHTER', 'DECISION', 'DELIVERY', 'DESCRIBE', 'DISCOVER',
  'DISTANCE', 'DOCUMENT', 'DOWNTOWN', 'ELEPHANT', 'ENGINEER', 'ENORMOUS',
  'ENTRANCE', 'ENVELOPE', 'EVERYONE', 'EXCHANGE', 'EXERCISE', 'FAVORITE',
  'FESTIVAL', 'FOOTBALL', 'FOUNTAIN', 'FUNCTION', 'GENEROUS', 'GRATEFUL',
  'HOSPITAL', 'INDUSTRY', 'INSTANCE', 'INTEREST', 'INTERIOR', 'INTERNAL',
  'INTERNET', 'KEYBOARD', 'LANGUAGE', 'LAUGHTER', 'LEARNING', 'MAGAZINE',
  'MAGNETIC', 'MATERIAL', 'MEDICINE', 'MIDNIGHT', 'MOMENTUM', 'MOUNTAIN',
  'MOVEMENT', 'NATIONAL', 'ORDINARY', 'ORIGINAL', 'PAINTING', 'PARALLEL',
  'PERSONAL', 'PLATFORM', 'PLEASANT', 'POSITION', 'POSITIVE', 'POSSIBLE',
  'PRACTICE', 'PRESENCE', 'PRESSURE', 'PREVIOUS', 'PRINCESS', 'PRIORITY',
  'PROPERTY', 'PURCHASE', 'QUESTION', 'RELATIVE', 'REMEMBER', 'RESEARCH',
  'RESOURCE', 'RESPONSE', 'SANDWICH', 'SCHEDULE', 'SEASONAL', 'SECURITY',
  'SENTENCE', 'SEPARATE', 'SHOULDER', 'SOLUTION', 'SOUTHERN', 'SPECIFIC',
  'STANDARD', 'STRAIGHT', 'STRENGTH', 'STRANGER', 'SUNSHINE', 'SURPRISE',
  'TOGETHER', 'TOMORROW', 'TREASURE', 'UMBRELLA', 'UNIVERSE', 'VACATION',
  'YOURSELF',
  // --- 9 letters ---
  'ADVENTURE', 'AFTERNOON', 'BEAUTIFUL', 'BREAKFAST', 'BUTTERFLY', 'CELEBRATE',
  'CHALLENGE', 'CHARACTER', 'CHOCOLATE', 'COMMUNITY', 'CONFIDENT', 'DANGEROUS',
  'DIFFERENT', 'DIRECTION', 'DISCOVERY', 'EDUCATION', 'EXCELLENT', 'EXPENSIVE',
  'FANTASTIC', 'FIREWORKS', 'FURNITURE', 'GENTLEMAN', 'HAPPINESS', 'IMPORTANT',
  'INFLUENCE', 'INVENTION', 'KNOWLEDGE', 'LANDSCAPE', 'LIGHTNING', 'MARVELOUS',
  'MEMORABLE', 'MOONLIGHT', 'MUSICIANS', 'NIGHTFALL', 'ORCHESTRA', 'PENINSULA',
  'PINEAPPLE', 'POTENTIAL', 'PRESIDENT', 'PRINCIPLE', 'RECOGNIZE', 'SATELLITE',
  'SEPTEMBER', 'SITUATION', 'SOMETIMES', 'STRUCTURE', 'SUBSTANCE', 'TELEPHONE',
  'TELESCOPE', 'TREATMENT', 'UNDERLINE', 'VEGETABLE', 'WATERFALL',
  'WONDERFUL', 'YESTERDAY'
];

const BANK_SET = new Set(WORD_BANK);

/** can `word` be spelled from the letter multiset `pool`? */
export function canForm(word: string, pool: string[]): boolean {
  const avail = new Map<string, number>();
  for (const l of pool) avail.set(l, (avail.get(l) ?? 0) + 1);
  for (const ch of word) {
    const n = avail.get(ch) ?? 0;
    if (n === 0) return false;
    avail.set(ch, n - 1);
  }
  return true;
}

export interface HuntPuzzle {
  /** all puzzle letters; letters[0] is the CENTER (mandatory) letter */
  letters: string[];
  center: string;
  /** every bank word formable from `letters` that contains the center */
  words: string[];
}

/** how big the puzzles get per difficulty */
const HUNT_TUNING: Record<Difficulty, { baseLen: number[]; min: number; max: number }> = {
  easy: { baseLen: [6], min: 5, max: 12 },
  medium: { baseLen: [7], min: 8, max: 18 },
  hard: { baseLen: [8, 9], min: 11, max: 26 },
  pro: { baseLen: [9], min: 14, max: 32 },
  extreme: { baseLen: [9], min: 18, max: 40 }
};

function solutionsFor(letters: string[], center: string): string[] {
  return WORD_BANK.filter(
    (w) => w.length >= 3 && w.includes(center) && canForm(w, letters)
  ).sort((a, b) => a.length - b.length || a.localeCompare(b));
}

/**
 * Build a random hunt: pick a bank word as the letter pool, pick a center
 * letter, and target every bank word hiding inside. Retries until the word
 * count lands in the difficulty's window (falls back to the closest seen).
 */
export function generateHunt(difficulty: Difficulty): HuntPuzzle {
  const { baseLen, min, max } = HUNT_TUNING[difficulty];
  const bases = WORD_BANK.filter((w) => baseLen.includes(w.length));
  let best: HuntPuzzle | null = null;
  let bestGap = Infinity;
  for (let attempt = 0; attempt < 250; attempt++) {
    const base = bases[Math.floor(Math.random() * bases.length)];
    const letters = base.split('');
    const center = letters[Math.floor(Math.random() * letters.length)];
    const words = solutionsFor(letters, center);
    const puzzle: HuntPuzzle = {
      letters: [center, ...shuffled(removeOne(letters, center))],
      center,
      words
    };
    if (words.length >= min && words.length <= max) return puzzle;
    const gap = words.length < min ? min - words.length : words.length - max;
    if (gap < bestGap) {
      bestGap = gap;
      best = puzzle;
    }
  }
  return best!;
}

function removeOne(letters: string[], letter: string): string[] {
  const i = letters.indexOf(letter);
  return [...letters.slice(0, i), ...letters.slice(i + 1)];
}

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** sanity checks for `npm run validate` */
export function validateWordBank(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const w of WORD_BANK) {
    if (!/^[A-Z]{3,9}$/.test(w)) errors.push(`invalid word "${w}"`);
    if (seen.has(w)) errors.push(`duplicate word "${w}"`);
    seen.add(w);
  }
  return errors;
}

export function isBankWord(w: string): boolean {
  return BANK_SET.has(w);
}
