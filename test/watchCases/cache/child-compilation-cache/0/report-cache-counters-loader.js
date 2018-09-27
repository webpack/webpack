var map = new Map();
var currentWatchStepModule = require("../../../../helpers/currentWatchStep");
var cacheMap = new WeakMap();

const getCache = (associate, path) => {
	let o = cacheMap.get(associate);
	if(o === undefined) {
		o = new Map();
		cacheMap.set(associate, o);
	}
	let c = o.get(path);
	if(c === undefined) {
		c = { counter: 0 };
		o.set(path, c);
	}
	return c;
};

module.exports = function(source) {
	if(map.has(currentWatchStepModule.step)) return map.get(currentWatchStepModule.step);

	const compilationCache = getCache(this._compiler.root, this._compilation.compilerPath);
	compilationCache.counter++;

	var childCompiler = this._compilation.createChildCompiler("my-compiler " + source.trim(), {
		filename: "test"
	});
	var callback = this.async();
	childCompiler.runAsChild((err, entries, compilation) => {
		if(err) return callback(err);

		const childCache = getCache(this._compiler.root, compilation.compilerPath);
		childCache.counter++;

		var result = `module.exports = ${JSON.stringify([
			this._compilation.compilerPath,
			compilationCache.counter,
			compilation.compilerPath,
			childCache.counter
		])}; // ${source}`;
		map.set(currentWatchStepModule.step, result);
		callback(null, result);
	});
};
