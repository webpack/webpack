// Original named import/export tests
export { a as a1 } from 'externals0'
import { a as a2 } from 'externals1'
import defaultValue from 'externals2'
import 'externals3'

// Namespace import tests
import * as ns1 from 'externals0'
import * as ns2 from 'externals1'

// Reexport cases
export * from 'externals0'
export * as ns3 from 'externals1'
export { b as b1, c as c1 } from 'externals0'

import './lib'
import './unused'
import './conflict'
import './with-attributes'

// Test unused imports (should generate empty import)
import { unused1, unused2 } from 'externals0';

// Import but only use some exports to trigger export analysis in _analyseModule
import { export1, export2, export3, export4 } from 'externals1';

// Use the imports to ensure they're not tree-shaken
a2;
defaultValue;
ns1.a;
ns1.b;
ns2.a;

// Only use some of the named exports to test export tracking
export1;
export2;
// export3 and export4 are intentionally not used

// Test that side-effect import works
export const sideEffectLoaded = true;
