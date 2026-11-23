import * as barrel from "./barrel.js";
import * as registry from "./registry-barrel.js";
import { ns } from "./effect-barrel-b.js";

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

// concatenation resolves `ns.n1` to the leaf's own binding
export const run = () => [
	read(barrel),
	read(registry),
	registry.evaluated,
	ns.n1()
];
