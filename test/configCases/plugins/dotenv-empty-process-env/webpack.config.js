"use strict";

/**
 * @param {import("../../../../").Compiler} compiler compiler
 * @returns {void}
 */
const setProcessEnv = (compiler) => {
	const values = {
		WEBPACK_DOTENV_EMPTY_PROCESS_ONLY: "",
		WEBPACK_DOTENV_EMPTY_OVERRIDE: "",
		WEBPACK_DOTENV_NONEMPTY: "from-process"
	};
	/** @type {Map<string, string | undefined>} */
	const previousValues = new Map();

	compiler.hooks.beforeCompile.tap("TestEmptyProcessEnv", () => {
		for (const [key, value] of Object.entries(values)) {
			previousValues.set(key, process.env[key]);
			process.env[key] = value;
		}
	});
	compiler.hooks.afterCompile.tap("TestEmptyProcessEnv", () => {
		for (const [key, value] of previousValues) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		dotenv: true,
		plugins: [setProcessEnv]
	},
	{
		dotenv: { dir: false },
		plugins: [setProcessEnv]
	}
];
