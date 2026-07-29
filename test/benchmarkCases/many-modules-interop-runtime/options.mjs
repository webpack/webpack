import fs from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import memoryScaledCount from "../../harness/benchmark/scale.mjs";

// Five modules per group — an ESM leaf, two CommonJS leaves, and one consumer
// of each kind reaching across the other module system — so the bundle mixes
// both systems at every level instead of only at the entry. 2042 modules total.
const GROUP_COUNT = 400;
const GROUPS_PER_BARREL = 10;
// Memory mode measures allocations and the workload loop allocates nothing, so
// instantiating the graph is the whole signal there; a couple of rounds suffice.
const ROUNDS = memoryScaledCount(30, 2);
const TABLE_SIZE = 8;

/**
 * @param {number} index group index
 * @returns {string} generated module
 */
function generateEsm(index) {
	return `const table = [];
for (let i = 0; i < ${TABLE_SIZE}; i++) {
	table.push((i * ${index} + 1) | 0);
}

export const value = table[3];

export function scale(x) {
	return (x + table[x & ${TABLE_SIZE - 1}]) | 0;
}

export default function identity(x) {
	return (x + ${index}) | 0;
}
`;
}

/**
 * @param {number} index group index
 * @returns {string} generated module
 */
function generateCommonJs(index) {
	return `const table = [];
for (let i = 0; i < ${TABLE_SIZE}; i++) {
	table.push((i * ${index} + 3) | 0);
}

exports.value = table[5];

exports.scale = function scale(x) {
	return (x + table[x & ${TABLE_SIZE - 1}]) | 0;
};

module.exports.identity = function identity(x) {
	return (x + ${index}) | 0;
};
`;
}

/**
 * `module.exports` assigned a function, the shape that makes an ESM default
 * import go through the runtime's compat getter instead of a direct property
 * read on the exports object.
 * @param {number} index group index
 * @returns {string} generated module
 */
function generateCommonJsCallable(index) {
	return `module.exports = function callable(x) {
	return (x + ${index}) | 0;
};

module.exports.extra = function extra(x) {
	return (x * 2 + ${index}) | 0;
};
`;
}

/**
 * CommonJS reading ESM: `require()` hands back a namespace object the runtime
 * builds, `default` binding included.
 * @param {number} index group index
 * @returns {string} generated module
 */
function generateCommonJsConsumer(index) {
	return `const esm = require("./esm-${index}.js");
const commonjs = require("./commonjs-${index}.js");

module.exports.call = function call(x) {
	return (esm.default(x) + esm.scale(x) + commonjs.identity(x)) | 0;
};
`;
}

/**
 * ESM reading CommonJS: the default import goes through the compat getter, the
 * named one through webpack's analysis of the `exports` assignments. Export
 * names carry the index so the barrels can `export *` without conflicts.
 * @param {number} index group index
 * @returns {string} generated module
 */
function generateEsmConsumer(index) {
	return `import commonjsDefault from "./commonjs-${index}.js";
import { scale } from "./commonjs-${index}.js";

export const total${index} = commonjsDefault.value;

export function mix${index}(x) {
	return (commonjsDefault.identity(x) + scale(x)) | 0;
}
`;
}

/**
 * @param {string[]} requests re-exported requests
 * @returns {string} generated module
 */
function generateBarrel(requests) {
	return requests
		.map((request) => `export * from ${JSON.stringify(request)};\n`)
		.join("");
}

/**
 * Entry aggregator. Every round walks each group through all the ways the two
 * module systems reach each other: default, namespace and named import of a
 * CommonJS module, a callable one imported as default, a CommonJS module that
 * consumed ESM, and an ESM module that consumed CommonJS — the last one behind
 * a two-level barrel, read once as a named import and once off the namespace
 * object.
 * @param {number} groupCount count of groups
 * @returns {string} generated module
 */
function generateAggregator(groupCount) {
	const imports = ['import * as barrel from "./barrel.js";'];
	const barrelNames = [];
	const body = [];

	for (let index = 0; index < groupCount; index++) {
		imports.push(
			`import commonjsDefault${index} from "./commonjs-${index}.js";
import * as commonjsNamespace${index} from "./commonjs-${index}.js";
import { scale as commonjsNamed${index} } from "./commonjs-${index}.js";
import callable${index} from "./commonjs-callable-${index}.js";
import consumer${index} from "./commonjs-consumer-${index}.js";`
		);
		barrelNames.push(`mix${index}`);
		body.push(
			`		total = commonjsDefault${index}.scale(total);
		total = commonjsNamespace${index}.identity(total);
		total = commonjsNamed${index}(total);
		total = callable${index}(total);
		total = callable${index}.extra(total);
		total = consumer${index}.call(total);
		total = mix${index}(total);
		total = (total + barrel.total${index}) | 0;`
		);
	}

	imports.push(`import { ${barrelNames.join(", ")} } from "./barrel.js";`);

	return `${imports.join("\n")}

export function run(seed) {
	let total = seed | 0;

	for (let round = 0; round < ${ROUNDS}; round++) {
${body.join("\n")}
	}

	return total;
}
`;
}

export async function setup() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const generated = resolve(__dirname, "./generated");

	await fs.rm(generated, { recursive: true, force: true });
	await fs.mkdir(generated, { recursive: true });

	/** @type {string[]} */
	const barrels = [];

	for (let start = 0; start < GROUP_COUNT; start += GROUPS_PER_BARREL) {
		/** @type {string[]} */
		const esmConsumers = [];

		for (
			let index = start;
			index < Math.min(start + GROUPS_PER_BARREL, GROUP_COUNT);
			index++
		) {
			await fs.writeFile(
				resolve(generated, `./esm-${index}.js`),
				generateEsm(index)
			);
			await fs.writeFile(
				resolve(generated, `./commonjs-${index}.js`),
				generateCommonJs(index)
			);
			await fs.writeFile(
				resolve(generated, `./commonjs-callable-${index}.js`),
				generateCommonJsCallable(index)
			);
			await fs.writeFile(
				resolve(generated, `./commonjs-consumer-${index}.js`),
				generateCommonJsConsumer(index)
			);
			await fs.writeFile(
				resolve(generated, `./esm-consumer-${index}.js`),
				generateEsmConsumer(index)
			);
			esmConsumers.push(`./esm-consumer-${index}.js`);
		}

		const barrel = `./barrel-${start / GROUPS_PER_BARREL}.js`;

		await fs.writeFile(
			resolve(generated, barrel),
			generateBarrel(esmConsumers)
		);
		barrels.push(barrel);
	}

	await fs.writeFile(
		resolve(generated, "./barrel.js"),
		generateBarrel(barrels)
	);
	await fs.writeFile(
		resolve(generated, "./module.js"),
		generateAggregator(GROUP_COUNT)
	);
}
