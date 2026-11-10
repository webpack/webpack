"use strict";

const values = {
	DOTENV_EMPTY_PROCESS_ONLY: "",
	DOTENV_EMPTY_OVERRIDE: "",
	DOTENV_NONEMPTY: "from-process"
};
/** @type {Map<string, string | undefined>} */
const previousValues = new Map();
let compiling = 0;

/**
 * Sets the variables while any of the compilers compiles. They run at once, so
 * the first to start saves what the process held and the last to end puts it
 * back; each saving its own would have one restore the other's values.
 * @param {import("../../../../").Compiler} compiler compiler
 * @returns {void}
 */
const setProcessEnv = (compiler) => {
	compiler.hooks.beforeCompile.tap("TestEmptyProcessEnv", () => {
		if (compiling++ === 0) {
			for (const [key, value] of Object.entries(values)) {
				previousValues.set(key, process.env[key]);
				process.env[key] = value;
			}
		}
	});
	compiler.hooks.afterCompile.tap("TestEmptyProcessEnv", () => {
		if (--compiling !== 0) return;
		for (const [key, value] of previousValues) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
		previousValues.clear();
	});
};

// WHY: the variables are set on the process every case compiles in, so they
// carry a prefix of their own rather than webpack's `WEBPACK_`, which a case
// such as `import-meta-env` snapshots in full.
const prefix = "DOTENV_";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		dotenv: { prefix },
		plugins: [setProcessEnv]
	},
	{
		dotenv: { dir: false, prefix },
		plugins: [setProcessEnv]
	}
];
