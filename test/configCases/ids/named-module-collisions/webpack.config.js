"use strict";

const { getLongModuleName } = require("../../../../lib/ids/IdHelpers");

/** @import { Configuration, Module as WebpackModule } from "../../../../" */
/** @import Module from "../../../../lib/module/Module.js" */

/** @type {Configuration[]} */
module.exports = [false, true].map((reverse) => ({
	mode: "development",
	optimization: { moduleIds: "named" },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("test", (compilation) => {
				compilation.hooks.beforeModuleIds.tap("test", () => {
					const modules = [...compilation.modules]
						.filter((module) => module.identifier().includes("module.js?"))
						.sort((a, b) => (a.identifier() < b.identifier() ? -1 : 1));
					expect(modules).toHaveLength(3);
					const [first, second, third] = modules;
					const longName = getLongModuleName(
						"shared",
						/** @type {Module & WebpackModule} */ (first),
						compiler.context,
						compilation.outputOptions.hashFunction,
						compiler.root
					);
					first.libIdent = second.libIdent = () => "shared";
					third.libIdent = () => longName;
					// Exercise the collision before and after the unique short name.
					if (reverse) modules.reverse();
					for (const module of modules) {
						compilation.modules.delete(module);
						compilation.modules.add(module);
					}
					compilation.hooks.moduleIds.tap({ name: "test", stage: 100 }, () => {
						const { chunkGraph } = compilation;
						expect(chunkGraph.getModuleId(first)).toBe(`${longName}0`);
						expect(chunkGraph.getModuleId(third)).toBe(`${longName}1`);
					});
				});
			});
		}
	]
}));
