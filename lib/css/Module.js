const CSSParser = require('./Parser');
const CSSGenerator = require('./Generator');

const Template = require('webpack/lib/Template');
const { ConcatSource } = require('webpack-sources');

class CSSModulesPlugin {
	constructor() {
		this.plugin = 'CSSModulesPlugin';
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for('css/experimental').tap(plugin, () => {
				return new CSSParser();
			})

			createGenerator.for('css/experimental').tap(plugin, () => {
				return new CSSGenerator();
			})

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				const output = options.outputOptions;

				const { moduleTemplates, dependencyTemplates } = options;

				for (const module of chunk.modulesIterable) {
					if (module.type && module.type.startsWith('css')) {
						const filenameTemplate = output.CSSModuleFilename;

						result.push({
							// render: () => this.renderCSSModules(
							//   module,
							//   moduleTemplates.css,
							//   dependencyTemplates
							// ),
							render: () => this.renderCSS(
								chunkTemplate,
								chunk,
								moduleTemplates.css,
								dependencyTemplates
							),
							filenameTemplate,
							pathOptions: { module },
							identifier: `CSSModule ${module.id}`,
							hash: module.hash
						})
					}
				}

				return result;
			})

		//   const { mainTemplate } = compilation
		//
		//   mainTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
		//     const chunk = options.chunk
		//
		//     const hash = options.hash
		//     const fullHash = options.fullHash
		//
		//     const output = options.outputOptions
		//     const { moduleTemplates, dependencyTemplates } = options
		//
		//     let filenameTemplate
		//
		//      if (chunk.filenameTemplate) {
		//        filenameTemplate = chunk.filenameTemplate
		//      } else {
		//        filenameTemplate = output.CSSFilename
		//      }
		//
		//     filenameTemplate = output.filename;
		//
		//     const useChunkHash = compilation.mainTemplate.useChunkHash(chunk);
		//
		//     result.push({
		//       render: () => mainTemplate.render(
		//         hash,
		//         chunk,
		//         moduleTemplates.css,
		//         dependencyTemplates
		//       ),
		//       filenameTemplate,
		//       pathOptions: { noChunkHash: !useChunkHash, chunk },
		//       identifier: `chunk${chunk.id}`,
		//       hash: useChunkHash ? chunk.hash : fullHash
		//     })
		//
		//     return result
		//   })
		//
		//   mainTemplate.hooks.modules.tap(
		//     plugin,
		//     (source, chunk, hash, moduleTemplate, dependencyTemplates) => {
		//       return Template.renderCSSChunkModules(
		//         chunk,
		//         module => module.type.startsWith('css'),
		//         moduleTemplate,
		//         dependencyTemplates,
		//         `/* ${chunk.name} */`
		//       );
		//     }
		//   )
		})
	}

	renderCSSModules (module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates, {});
	}

	renderCSS (chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const { modules, render } = chunkTemplate.hooks;

		const sources = Template.renderCSSChunk(
			chunk,
			(module) => module.type.startsWith('css'),
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

module.exports = CSSModulesPlugin;
