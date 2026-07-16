"use strict";

// Compile-only: with `resolve` disabled the call stays as native
// `import.meta.resolve`, which only runs in a real ESM runtime.
module.exports = {
	noTests: true
};
