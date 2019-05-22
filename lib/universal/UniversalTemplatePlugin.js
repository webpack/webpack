/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const UniversalChunkTemplatePlugin = require("./UniversalChunkTemplatePlugin");

class UniversalTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"UniversalTemplatePlugin",
			compilation => {
				new UniversalChunkTemplatePlugin(compilation).apply(
					compilation.chunkTemplate
				);
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"UniversalTemplatePlugin",
					(chunk, runtimeRequirements) => {
						runtimeRequirements.add(RuntimeGlobals.environment);
					}
				);
			}
		);
	}
}

module.exports = UniversalTemplatePlugin;
