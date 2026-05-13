import { moduleA } from "./module-a.js";

// module-b imports module-a; under the chained dependOn webpack should
// resolve this import through the shared runtime rather than duplicating
// module-a into both chunks.
globalThis.__moduleB = `module-b sees: ${moduleA}`;
