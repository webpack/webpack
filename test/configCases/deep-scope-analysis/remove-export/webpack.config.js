const { DependencyReference } = require("../../../../").dependencies;

/** @typedef {import("../../../../lib/Compilation")} Compilation */

module.exports = {
	optimization: {
		usedExports: true,
		concatenateModules: false
	},
	plugins: [
		function() {
			this.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.dependencyReference.tap("Test", (ref, dep) => {
					const module = compilation.moduleGraph.getParentModule(dep);
					if (
						module.identifier().endsWith("module.js") &&
						ref.module &&
						ref.module.identifier().endsWith("reference.js") &&
						Array.isArray(ref.importedNames) &&
						ref.importedNames.some(
							names => names.length === 1 && names[0] === "unused"
						)
					) {
						const newExports = ref.importedNames.filter(
							names => names.length !== 1 || names[0] !== "unused"
						);
						return new DependencyReference(
							() => ref.module,
							newExports,
							ref.weak,
							ref.order
						);
					}
					return ref;
				});
			});
		}
	]
};
