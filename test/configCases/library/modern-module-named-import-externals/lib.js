import { b as a1 } from 'externals0'
import * as externals2NS from 'externals2'

// Test namespace reexport
export * as reexportedNS from 'externals2'

// Test mixed reexports
export { c, d } from 'externals0'

a1;
externals2NS.default;
