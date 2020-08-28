const {
	SingleEntryPlugin,
	node: { NodeTemplatePlugin }
} = require("../../../..");

const compilerCache = new WeakMap();

module.exports = function (source) {
	let childCompiler = compilerCache.get(this._compiler);
	if (childCompiler === undefined) {
		childCompiler = this._compilation.createChildCompiler(
			"my-compiler|" + this.request,
			{
				filename: "test.js"
			},
			[
				new NodeTemplatePlugin(),
				new SingleEntryPlugin(this.context, this.resource)
			]
		);
		compilerCache.set(this._compiler, childCompiler);
	}
	const callback = this.async();
	childCompiler.parentCompilation = this._compilation;
	childCompiler.runAsChild((err, entries, compilation) => {
		if (err) return callback(err);

		const result = `export const assets = ${JSON.stringify(
			compilation.getAssets().map(a => a.name)
		)};\n${source}`;

		callback(null, result);
	});
};
