import fs from "fs/promises";
import path from "path";
import { deterministicBytes } from "./prng.mjs";
import { generateCssSource, generateJavaScriptSource } from "./sources.mjs";

/**
 * Deterministic on-disk project generators for e2e benchmarks. Output goes to
 * `<caseDir>/generated` (gitignored via /test/`**`/generated/`**`) and is
 * recreated from scratch on every run — content depends only on the arguments.
 */

/**
 * @param {string} dir directory to recreate
 * @returns {Promise<void>}
 */
async function recreate(dir) {
	await fs.rm(dir, { recursive: true, force: true });
	await fs.mkdir(dir, { recursive: true });
}

/**
 * @typedef {object} ModuleTreeOptions
 * @property {string} dir output directory
 * @property {number} count number of modules
 * @property {"esm" | "cjs"} format module format
 * @property {number=} fanout imports per non-leaf module (default 4)
 * @property {number=} dynamicEvery every n-th edge becomes a dynamic import (0 = none)
 * @property {number=} paragraphs body size per module (default 2)
 */

/**
 * Generate a module tree: module i imports its children by index
 * (i * fanout + 1 … i * fanout + fanout), giving a balanced tree with
 * deterministic shape and content. Entry is `<dir>/module-0.js`.
 * @param {ModuleTreeOptions} options options
 * @returns {Promise<string>} absolute path of the entry module
 */
export async function generateModuleTree(options) {
	const {
		dir,
		count,
		format,
		fanout = 4,
		dynamicEvery = 0,
		paragraphs = 2
	} = options;
	await recreate(dir);
	const esm = format === "esm";
	for (let i = 0; i < count; i++) {
		/** @type {string[]} */
		const head = [];
		/** @type {string[]} */
		const body = [];
		for (let child = i * fanout + 1, k = 0; k < fanout; k++, child++) {
			if (child >= count) break;
			const specifier = `./module-${child}.js`;
			const isDynamic = dynamicEvery > 0 && child % dynamicEvery === 0;
			if (isDynamic) {
				body.push(
					esm
						? `export const lazy${k} = import(${JSON.stringify(specifier)});`
						: `require.ensure([], () => { total += require(${JSON.stringify(specifier)}); });`
				);
			} else if (esm) {
				head.push(`import child${k} from ${JSON.stringify(specifier)};`);
				body.push(`total += child${k};`);
			} else {
				head.push(`const child${k} = require(${JSON.stringify(specifier)});`);
				body.push(`total += child${k};`);
			}
		}
		const source = [
			...head,
			"let total = 1;",
			...body,
			generateJavaScriptSource(paragraphs, esm),
			esm ? "export default total;" : "module.exports = total;"
		].join("\n");
		await fs.writeFile(path.join(dir, `module-${i}.js`), source);
	}
	return path.join(dir, "module-0.js");
}

/**
 * @typedef {object} CssProjectOptions
 * @property {string} dir output directory
 * @property {number} count number of css/js module pairs
 * @property {number=} rulesPerFile rules per css file (default 30)
 */

/**
 * Generate `<n>.module.css` files plus a JS entry importing all of them.
 * @param {CssProjectOptions} options options
 * @returns {Promise<string>} absolute path of the entry module
 */
export async function generateCssProject(options) {
	const { dir, count, rulesPerFile = 30 } = options;
	await recreate(dir);
	/** @type {string[]} */
	const imports = [];
	for (let i = 0; i < count; i++) {
		await fs.writeFile(
			path.join(dir, `style-${i}.module.css`),
			generateCssSource(rulesPerFile, true)
		);
		imports.push(
			`import * as style${i} from ${JSON.stringify(`./style-${i}.module.css`)};`,
			`used += Object.keys(style${i}).length;`
		);
	}
	const entry = path.join(dir, "index.js");
	await fs.writeFile(
		entry,
		`let used = 0;\n${imports.join("\n")}\nexport default used;\n`
	);
	return entry;
}

/**
 * @typedef {object} AssetProjectOptions
 * @property {string} dir output directory
 * @property {number} count number of assets
 * @property {number=} size bytes per asset (default 4096)
 */

/**
 * Generate binary assets plus a JS entry importing all of them as URLs.
 * @param {AssetProjectOptions} options options
 * @returns {Promise<string>} absolute path of the entry module
 */
export async function generateAssetProject(options) {
	const { dir, count, size = 4096 } = options;
	await recreate(dir);
	/** @type {string[]} */
	const imports = [];
	for (let i = 0; i < count; i++) {
		await fs.writeFile(
			path.join(dir, `asset-${i}.bin`),
			deterministicBytes(i + 1, size)
		);
		imports.push(
			`import asset${i} from ${JSON.stringify(`./asset-${i}.bin`)};`,
			`urls.push(asset${i});`
		);
	}
	const entry = path.join(dir, "index.js");
	await fs.writeFile(
		entry,
		`/** @type {string[]} */\nconst urls = [];\n${imports.join("\n")}\nexport default urls;\n`
	);
	return entry;
}

/**
 * @typedef {object} JsonProjectOptions
 * @property {string} dir output directory
 * @property {number} count number of JSON modules
 * @property {number=} entriesPerFile keys per JSON file (default 200)
 */

/**
 * Generate JSON modules plus a JS entry importing all of them.
 * @param {JsonProjectOptions} options options
 * @returns {Promise<string>} absolute path of the entry module
 */
export async function generateJsonProject(options) {
	const { dir, count, entriesPerFile = 200 } = options;
	await recreate(dir);
	/** @type {string[]} */
	const imports = [];
	for (let i = 0; i < count; i++) {
		/** @type {Record<string, unknown>} */
		const data = {};
		for (let k = 0; k < entriesPerFile; k++) {
			data[`key_${i}_${k}`] =
				k % 3 === 0
					? { nested: k, list: [k, `${k}`, k % 2 === 0] }
					: k % 3 === 1
						? `value ${i}-${k}`
						: k * 1.5;
		}
		await fs.writeFile(
			path.join(dir, `data-${i}.json`),
			JSON.stringify(data, null, "\t")
		);
		imports.push(
			`import data${i} from ${JSON.stringify(`./data-${i}.json`)};`,
			`total += Object.keys(data${i}).length;`
		);
	}
	const entry = path.join(dir, "index.js");
	await fs.writeFile(
		entry,
		`let total = 0;\n${imports.join("\n")}\nexport default total;\n`
	);
	return entry;
}
