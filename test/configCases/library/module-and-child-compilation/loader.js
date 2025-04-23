/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = async function loader() {
	const callback = this.async();
	const loader = this;
	const compilerName = `extract:${loader.resourcePath}`;
	const compiler = loader._compiler;
	const filename = "*";
	const childCompiler = loader._compilation.createChildCompiler(
		compilerName,
		{
			filename,
		},
		[]
	);

	const NodeTemplatePlugin = compiler.webpack.node.NodeTemplatePlugin;
	new NodeTemplatePlugin().apply(childCompiler);

	const NodeTargetPlugin = compiler.webpack.node.NodeTargetPlugin;
	new NodeTargetPlugin().apply(childCompiler);

	const {
		EntryOptionPlugin,
		library: {
			EnableLibraryPlugin
		}
	} = loader._compiler.webpack;

	new EnableLibraryPlugin('commonjs2').apply(childCompiler);

	EntryOptionPlugin.applyEntryOption(childCompiler, loader.context, {
		child: {
			library: {
				type: 'commonjs2'
			},
			import: [`!!${loader.resourcePath}`]
		}
	});

	const LimitChunkCountPlugin = compiler.webpack.optimize.LimitChunkCountPlugin;

	new LimitChunkCountPlugin({
		maxChunks: 1
	}).apply(childCompiler);

	let source;

	childCompiler.hooks.compilation.tap(compilerName, compilation => {
		compilation.hooks.processAssets.tap(compilerName, () => {
			source = compilation.assets[filename] && compilation.assets[filename].source();

			// Remove all chunk assets
			compilation.chunks.forEach(chunk => {
				chunk.files.forEach(file => {
					compilation.deleteAsset(file);
				});
			});
		});
	});

	try {
		await new Promise((resolve, reject) => {
			childCompiler.runAsChild((err, _entries, compilation) => {
				if (err) {
					return reject(err);
				}

				if (compilation.errors.length > 0) {
					return reject(compilation.errors[0]);
				}

				resolve();
			});
		})
	} catch (e) {
		callback(e);
		return;
	}

	if (!source) {
		callback(new Error("Didn't get a result from child compiler"));
		return;
	}

	callback(null, source);
}
