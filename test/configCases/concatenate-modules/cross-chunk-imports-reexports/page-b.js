import * as barrel from "./barrel.js";
import * as registry from "./registry-barrel.js";

/**
 * Returns what a barrel re-exports.
 * @param {typeof barrel} source the barrel
 * @returns {string[]} the values
 */
const read = (source) => [
	source.x(),
	source.renamed(),
	source.p(),
	source.q(),
	source.ns.n1(),
	Object.keys(source.ns).join()
];

export const run = () => [read(barrel), read(registry), registry.evaluated];
