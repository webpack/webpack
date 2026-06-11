"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	plugins: [
		function testPlugin(compiler) {
			compiler.hooks.compilation.tap("test", (compilation) => {
				compilation.hooks.afterSeal.tap("test", () => {
					let found = false;
					for (const module of compilation.modules) {
						if (module.constructor.name !== "ConcatenatedModule") continue;
						found = true;
						const topLevelDeclarations =
							module.buildInfo && module.buildInfo.topLevelDeclarations;
						expect(topLevelDeclarations).toBeDefined();
						// declarations of all inner modules must be merged
						expect(topLevelDeclarations).toContain("localDecl");
						expect(topLevelDeclarations).toContain("innerDecl");
						expect(topLevelDeclarations).toContain("getValue");
					}
					expect(found).toBe(true);
				});
			});
		}
	]
};
