/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource } = require("webpack-sources");

class HTMLGenerator {
	generate(module, { moduleGraph }) {
		let source = module.originalSource().source();

		for (const dependency of module.dependencies) {
			const resolved = moduleGraph.getResolvedModule(dependency);

			if (dependency.name.includes("HTML__URL")) {
				source = source.replace(
					"${" + dependency.name + "}",
					"/" + Object.keys(resolved.buildInfo.assets)[0]
				);
			}

			if (dependency.name.includes("HTML__IMPORT")) {
				source = source.replace(
					"${" + dependency.name + "}",
					resolved.originalSource().source()
				);
			}

			if (dependency.name.includes("HTML__ENTRY")) {
				source = source.replace(dependency.name, resolved.userRequest);
			}
		}

		const issuer = moduleGraph.getIssuer(module);

		if (issuer && issuer.type.includes("javascript")) {
			source = `module.exports = ${JSON.stringify(source)}`;
		}

		return new OriginalSource(source);
	}
}

module.exports = HTMLGenerator;
