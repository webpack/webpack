const HTMLParser = require('./Parser');
const HTMLGenerator = require('./Generator');

const Template = require('webpack/lib/Template');
const { ConcatSource } = require('webpack-sources');

class HTMLModulesPlugin {
	constructor() {
		this.plugin = 'HTMLModulesPlugin';
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for('html/experimental').tap(plugin, () => {
				return new HTMLParser();
			});

			createGenerator.for('html/experimental').tap(plugin, () => {
				return new HTMLGenerator();
			});

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				const output = options.outputOptions;

				const { moduleTemplates, dependencyTemplates } = options;

				for (const module of chunk.modulesIterable) {
					if (module.type && module.type.startsWith('html')) {
						const filenameTemplate = output.HTMLModuleFilename;

						result.push({
							render: () => this.renderHTMLModules(
								module,
								moduleTemplates.html,
								dependencyTemplates
							),
							// render: () => this.renderHTML(
							//   chunkTemplate,
							//   chunk,
							//   moduleTemplates.html,
							//   dependencyTemplates
							// ),
							filenameTemplate,
							pathOptions: { module },
							identifier: `HTMLModule ${module.id}`,
							hash: module.hash
						})
					}
				}

				return result;
			})

		// 	const { mainTemplate } = compilation;
    //
		// 	mainTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
		// 		const chunk = options.chunk;
    //
		// 		const hash = options.hash;
		// 		const fullHash = options.fullHash;
    //
		// 		const output = options.outputOptions;
		// 		const { moduleTemplates, dependencyTemplates } = options;
    //
		// 		let filenameTemplate;
    //
		// 		 if (chunk.filenameTemplate) {
		// 			 filenameTemplate = chunk.filenameTemplate;
		// 		 } else {
		// 			 filenameTemplate = output.HTMLFilename;
		// 		 }
    //
		// 		filenameTemplate = output.filename;
    //
		// 		const useChunkHash = mainTemplate.useChunkHash(chunk);
    //
		// 		result.push({
		// 			render: () => mainTemplate.render(
		// 				hash,
		// 				chunk,
		// 				moduleTemplates.html,
		// 				dependencyTemplates
		// 			),
		// 			filenameTemplate,
		// 			pathOptions: { noChunkHash: !useChunkHash, chunk },
		// 			identifier: `chunk${chunk.id}`,
		// 			hash: useChunkHash ? chunk.hash : fullHash
		// 		})
    //
		// 		return result;
		// 	})
    //
		// 	mainTemplate.hooks.modules.tap(
		// 		plugin,
		// 		(source, chunk, hash, moduleTemplate, dependencyTemplates) => {
		// 			return Template.renderChunkModules(
		// 				chunk,
		// 				module => module.type.startsWith('html'),
		// 				moduleTemplate,
		// 				dependencyTemplates,
		// 				`<!-- ${chunk.name} -->`
		// 			);
		// 		}
		// 	);
		// });
	}

	renderHTMLModules (module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates, {});
	}

	renderHTML (chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const { modules, render } = chunkTemplate.hooks;

		const sources = Template.renderHTMLChunk(
			chunk,
			module => module.type.startsWith('html'),
			moduleTemplate,
			dependencyTemplates
		);

		const core = modules.call(
			sources,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);

		let source = render.call(
			core,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);

		chunk.rendered = true;

		return new ConcatSource(core);
	}
}

module.exports = HTMLModulesPlugin;
