/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

class CSSTemplate {
	static render(renderContext, filterFn, moduleTemplate) {
		const { chunk, chunkGraph } = renderContext;

		const result = new ConcatSource();

		const modules = chunkGraph.getChunkModules(chunk).filter(filterFn);
		const removedModules = chunk.removedModules;

		const sources = modules.map(module => {
			return {
				id: chunkGraph.getModuleId(module),
				source: moduleTemplate.render(module, renderContext)
			};
		});

		if (removedModules && removedModules.length > 0) {
			for (const id of removedModules) {
				sources.push({
					id,
					source: "/* CSS Module removed */"
				});
			}
		}

		sources.sort().reduceRight((result, module, idx) => {
			if (idx !== 0) {
				result.add("\n");
			}

			result.add(`\n/* ${module.id} */\n`);
			result.add(module.source);

			return result;
		}, result);

		result.add("\n");

		return result;
	}
}

module.exports = CSSTemplate;
