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

// Use the imports to ensure they're not tree-shaken
a2;
defaultValue;
ns1.a;
ns1.b;
ns2.a;
