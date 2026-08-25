"use strict";

module.exports = {
	ecmaConformanceExpected: [
		// The point of this case: ESM output has no `require`, so the wasm loader
		// takes the `import()` branch whatever `environment.dynamicImport` says.
		/AsyncWasmLoadingRuntimeModule: .* needs output\.environment\.dynamicImport/
	]
};
