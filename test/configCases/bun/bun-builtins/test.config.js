"use strict";

// Stub Bun's runtime-provided built-in modules so the case runs offline (Node).
module.exports = {
	modules: {
		"bun:sqlite": { Database: class Database {} },
		"bun:ffi": { dlopen: () => ({}) }
	}
};
