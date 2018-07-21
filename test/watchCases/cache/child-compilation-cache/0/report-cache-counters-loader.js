var map = new Map();
var currentWatchStepModule = require("../../../../helpers/currentWatchStep");

module.exports = function(source) {
	if(map.has(currentWatchStepModule.step)) return map.get(currentWatchStepModule.step);
	this._compilation.cache.counter = (this._compilation.cache.counter || 0) + 1;

	var childCompiler = this._compilation.createChildCompiler("my-compiler " + source.trim(), {
		filename: "test"
	});
	var callback = this.async();
	childCompiler.runAsChild((err, entries, compilation) => {
		if(err) return callback(err);

		var childCache = compilation.cache;
		childCache.counter = (childCache.counter || 0) + 1;

		var result = `module.exports = [${this._compilation.cache.counter}, ${childCache.counter}]; // ${source}`;
		map.set(currentWatchStepModule.step, result);
		callback(null, result);
	});
};
