/** @typedef {import("../../../../").Configuration} Configuration */

/**
 * @param {Record<string, { name?: string, usedExports: string[], expect: Record<string, string[]> }>} testCases
 * @returns {Configuration[]} configurations
 */
module.exports = testCases => {
	/** @type {Configuration[]} */
	const configs = [];
	for (const name of Object.keys(testCases)) {
		const testCase = testCases[name];
		testCase.name = name;
		const entry = `../_helpers/entryLoader.js?${JSON.stringify(testCase)}!`;
		/** @type {{ alias: Record<string, string> }} */
		const resolve = {
			alias: {}
		};
		let i = 0;
		for (const file of Object.keys(testCase.expect)) {
			resolve.alias[file] = require.resolve("./inner-file") + "?" + i++;
		}
		configs.push({
			name: `${name} without module concatenation`,
			mode: "production",
			entry,
			resolve,
			optimization: {
				concatenateModules: false
			}
		});
		configs.push({
			name: `${name} with module concatenation`,
			mode: "production",
			entry,
			resolve
		});
	}
	return configs;
};
