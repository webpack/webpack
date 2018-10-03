const DependencyReference = require("../../../../").dependencies
	.DependencyReference;
module.exports = {
	optimization: {
		usedExports: true,
		concatenateModules: true
	},
	plugins: [
		function() {
			this.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.dependencyReference.tap(
					"Test",
					(ref, dep, module) => {
						if (
							module.identifier().endsWith("module.js") &&
							ref.module &&
							ref.module.identifier().endsWith("reference.js") &&
							Array.isArray(ref.importedNames) &&
							ref.importedNames.includes("unused")
						) {
							return new DependencyReference(
								() => ref.module,
								ref.importedNames.filter(item => item !== "unused"),
								ref.weak,
								ref.order
							);
						}
						return ref;
					}
				);
			});
		}
	]
};
