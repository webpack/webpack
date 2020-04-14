/** @typedef {import("../../../../lib/Compilation")} Compilation */

module.exports = {
	optimization: {
		usedExports: true,
		concatenateModules: false
	},
	plugins: [
		function () {
			this.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.dependencyReferencedExports.tap(
					"Test",
					(referencedExports, dep) => {
						const module = compilation.moduleGraph.getParentModule(dep);
						if (!module.identifier().endsWith("module.js"))
							return referencedExports;
						const refModule = compilation.moduleGraph.getModule(dep);
						if (
							refModule &&
							refModule.identifier().endsWith("reference.js") &&
							referencedExports.some(
								names => names.length === 1 && names[0] === "unused"
							)
						) {
							return referencedExports.filter(
								names => names.length !== 1 || names[0] !== "unused"
							);
						}
						return referencedExports;
					}
				);
			});
		}
	]
};
