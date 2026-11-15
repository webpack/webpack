"use strict";

/**
 * Runs every directory inside a config case as a case of its own: each keeps
 * its `webpack.config.js`, `test.config.js` and `test.filter.js`, builds into
 * an output directory of its own and has its test titles prefixed by its name.
 */

const fs = require("fs");
const path = require("path");

/** @typedef {import("../../").Configuration} Configuration */

/**
 * The `test.config.js` hooks a part may keep; any other throws, so no hook is
 * silently dropped by the merge.
 */
const HOOKS = ["afterExecute", "findBundle", "moduleScope"];

/**
 * A part's own files the merge does not read; a part holding one throws.
 */
const UNREAD = ["errors.js", "warnings.js", "infrastructure-log.js"];

/**
 * @typedef {object} Part
 * @property {string} name the part's directory name
 * @property {string} dir the part's directory
 * @property {Record<string, EXPECTED_FUNCTION>} hooks its `test.config.js` hooks
 */

/**
 * The parts of a merged case, each a directory holding a `webpack.config.js`
 * whose `test.filter.js`, if any, lets it run.
 * @param {string} caseDir the merged case's directory
 * @returns {Part[]} the parts that run, by name
 */
const partsOf = (caseDir) =>
	fs
		.readdirSync(caseDir)
		.sort()
		.filter((name) =>
			fs.existsSync(path.join(caseDir, name, "webpack.config.js"))
		)
		.map((name) => {
			const dir = path.join(caseDir, name);
			for (const file of UNREAD) {
				if (fs.existsSync(path.join(dir, file))) {
					throw new Error(`${name}/${file} is not read by a merged case`);
				}
			}
			const testConfig = path.join(dir, "test.config.js");
			const hooks = fs.existsSync(testConfig) ? require(testConfig) : {};
			for (const key of Object.keys(hooks)) {
				if (!HOOKS.includes(key)) {
					throw new Error(`${name}/test.config.js: unknown hook "${key}"`);
				}
			}
			return { name, dir, hooks };
		})
		.filter(({ dir }) => {
			const filter = path.join(dir, "test.filter.js");
			return !fs.existsSync(filter) || require(filter)();
		});

/** @type {WeakMap<Configuration, { part: Part, index: number, all: Configuration[] }>} */
const owners = new WeakMap();

/**
 * The merged case's `webpack.config.js`: every part's configurations in turn,
 * each with its part's directory as `context`, a `bundle<n>` named by its
 * index within the part and an output directory named after the part.
 * @param {string} caseDir the merged case's directory
 * @returns {(env: unknown, argv: { testPath: string }) => Promise<Configuration[]>} the configurations
 */
const webpackConfigOf = (caseDir) => async (env, argv) => {
	/** @type {Configuration[]} */
	const all = [];
	for (const part of partsOf(caseDir)) {
		const testPath = path.join(argv.testPath, part.name);

		let given = require(path.join(part.dir, "webpack.config.js"));

		if (typeof given === "function") given = await given(env, { testPath });
		/** @type {Configuration[]} */
		const list = await Promise.all(
			(Array.isArray(given) ? given : [given]).map((one) =>
				typeof one === "function" ? one(env, { testPath }) : one
			)
		);
		for (const [index, options] of list.entries()) {
			if (!options.context) options.context = part.dir;
			if (!options.output) options.output = {};
			if (!options.output.path) options.output.path = testPath;
			if (!options.output.filename) {
				options.output.filename = `bundle${index}${
					options.output.module || (options.experiments || {}).outputModule
						? ".mjs"
						: ".js"
				}`;
			}
			owners.set(options, { part, index, all: list });
			all.push(options);
		}
	}
	return all;
};

/**
 * Who a configuration belongs to.
 * @param {Configuration} options one configuration the merged case built
 * @returns {{ part: Part, index: number, all: Configuration[] }} its part, its index there and the part's configurations
 */
const ownerOf = (options) => {
	const owner = owners.get(options);
	if (owner === undefined) throw new Error("not a merged case's configuration");
	return owner;
};

/**
 * The merged case's `test.config.js`, handing each part's hooks its own
 * configuration and index.
 * @returns {Record<string, EXPECTED_FUNCTION>} the hooks
 */
const testConfigOf = () => ({
	/**
	 * @param {number} _i the index among all parts' configurations
	 * @param {Configuration} options one configuration
	 * @returns {string | string[] | undefined} its bundles, relative to the merged case's output
	 */
	findBundle(_i, options) {
		const { part, index } = ownerOf(options);
		const output = /** @type {{ path: string, filename: string }} */ (
			options.output
		);
		/** @type {string | string[] | undefined} */
		let found;
		if (part.hooks.findBundle) {
			found = part.hooks.findBundle(index, options);
		} else if (fs.existsSync(path.join(output.path, output.filename))) {
			found = output.filename;
		}
		if (found === undefined) return found;
		/**
		 * @param {string} file a bundle relative to the part's output
		 * @returns {string} it relative to the merged case's output
		 */
		const within = (file) =>
			path.isAbsolute(file) ? file : `./${path.join(part.name, file)}`;
		return Array.isArray(found) ? found.map(within) : within(found);
	},
	/**
	 * @param {Record<string, EXPECTED_ANY>} scope the bundle's module scope
	 * @param {Configuration} options the configuration it was built with
	 * @param {string} target the target it runs as
	 */
	moduleScope(scope, options, target) {
		const { part } = ownerOf(options);
		const it = scope.it;
		scope.it = (
			/** @type {string} */ title,
			/** @type {EXPECTED_ANY[]} */ ...rest
		) => it(`${part.name}: ${title}`, ...rest);
		if (part.hooks.moduleScope) part.hooks.moduleScope(scope, options, target);
	},
	/**
	 * @param {Configuration | Configuration[]} options every configuration
	 */
	afterExecute(options) {
		/** @type {Set<Part>} */
		const done = new Set();
		for (const one of Array.isArray(options) ? options : [options]) {
			const { part, all } = ownerOf(one);
			if (done.has(part) || !part.hooks.afterExecute) continue;
			done.add(part);
			part.hooks.afterExecute(all.length === 1 ? all[0] : all);
		}
	}
});

module.exports = { testConfigOf, webpackConfigOf };
