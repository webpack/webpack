/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */

const {
	SingleEntryPlugin,
	node: { NodeTemplatePlugin }
} = require("../../../..");

/** @type {WeakMap<Compiler, Compiler>} */
const compilerCache = new WeakMap();

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const compiler = /** @type {Compiler} */ (this._compiler);
	const compilation = /** @type {Compilation} */ (this._compilation);

	let childCompiler = compilerCache.get(compiler);
	if (childCompiler === undefined) {
		childCompiler = compilation.createChildCompiler(
			"my-compiler|" + this.request,
			{
				filename: "test.js"
			},
			[
				new NodeTemplatePlugin(),
				new SingleEntryPlugin(this.context, this.resource)
			]
		);
		compilerCache.set(compiler, childCompiler);
	}
	const callback = this.async();
	childCompiler.parentCompilation = this._compilation;
	childCompiler.runAsChild((err, entries, compilation) => {
		if (err) return callback(err);

		const result = `export const assets = ${JSON.stringify(
			/** @type {Compilation} */
			(compilation).getAssets().map(a => a.name)
		)};\n${source}`;

		callback(null, result);
	});
};
