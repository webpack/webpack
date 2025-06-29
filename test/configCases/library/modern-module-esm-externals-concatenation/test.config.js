module.exports = {
	// Skip runtime tests - ESM output incompatible with test runner
	noTests: true,
	findBundle(i, options) {
		return ["test.js"];
	},
	moduleScope(scope) {
		scope.external_esm = {
			default: "default-export",
			named1: "named-export-1",
			named2: "named-export-2",
			namedExport1: "named-export-1",
			namedExport2: "named-export-2"
		};
		scope.external_unused = {
			default: "unused-default",
			unusedExport1: "unused-1",
			unusedExport2: "unused-2",
			usedExport: "used-export"
		};
		scope.external_never_used = {
			default: "never-used-default",
			export1: "never-used-1",
			export2: "never-used-2"
		};
		scope.external_totally_unused = {
			default: "totally-unused-default",
			export1: "totally-unused-1",
			export2: "totally-unused-2"
		};
		scope.external_partially_unused = {
			default: "partially-unused-default",
			neverUsed1: "never-used-1",
			neverUsed2: "never-used-2",
			usedExport: "used-export"
		};
		scope.external_nested = {
			nested: {
				value: "nested-value"
			}
		};
	}
};
