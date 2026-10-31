import type { CSSProperties } from 'react';
import { domainColor } from '../../platform/brain/domains';

/** the Memory area's colour (from the one place areas keep it), as the stage's --bspan-area */
export const AREA_STYLE = { '--bspan-area': domainColor('memory') } as CSSProperties;
