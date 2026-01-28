/** @typedef {import("../../../../../").Compiler} Compiler */
/** @typedef {import("../../../../../").Compilation} Compilation */

var map = new Map();
var currentWatchStepModule = require("../../../../helpers/currentWatchStep");

/** @type {WeakMap<Compiler, Map<string, { counter: number }>>} */
var cacheMap = new WeakMap();

/**
 * @param {Compiler} associate associate
 * @param {string} path path
 * @returns {{ counter: number }} result
 */
const getCache = (associate, path) => {
	let o = cacheMap.get(associate);
	if (o === undefined) {
		o = new Map();
		cacheMap.set(associate, o);
	}
	let c = o.get(path);
	if (c === undefined) {
		c = { counter: 0 };
		o.set(path, c);
	}
	return c;
};

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function (source) {
	if (map.has(currentWatchStepModule.step))
		return map.get(currentWatchStepModule.step);

	const compiler = /** @type {Compiler} */ (this._compiler);
	const compilation = /** @type {Compilation} */ (this._compilation);

	const compilationCache = getCache(
		compiler.root,
		compilation.compilerPath
	);
	compilationCache.counter++;

	var childCompiler = compilation.createChildCompiler(
		"my-compiler " + source.trim(),
		{
			filename: "test"
		}
	);
	var callback = this.async();
	childCompiler.runAsChild((err, entries, _compilation) => {
		if (err) return callback(err);

		const compilation = /** @type {Compilation} */ (_compilation);

		const childCache = getCache(compiler.root, compilation.compilerPath);
		childCache.counter++;

		var result = `module.exports = ${JSON.stringify([
			/** @type {Compilation} */
			(this._compilation).compilerPath,
			compilationCache.counter,
			compilation.compilerPath,
			childCache.counter
		])}; // ${source}`;
		map.set(currentWatchStepModule.step, result);
		callback(null, result);
	});
};
