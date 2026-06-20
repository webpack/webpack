// Minimal stand-in for the JS "glue" Emscripten emits with
// `-sMODULARIZE -sEXPORT_ES6`. Real glue is large and minified, but the
// contract a bundler must satisfy is small: a default-exported factory that
// owns wasm instantiation and honors the `instantiateWasm` escape hatch.
export default function createModule(moduleArg = {}) {
	const Module = moduleArg;

	// The import object the wasm needs. Only the glue knows how to build it,
	// which is why webpack cannot instantiate the module itself.
	const imports = {
		env: {
			log(value) {
				if (Module.onLog) Module.onLog(value);
			}
		}
	};

	return new Promise((resolve, reject) => {
		const receiveInstance = (instance) => {
			Module.run = (n) => instance.exports.run(n);
			resolve(Module);
		};

		// Emscripten's official hook: hand instantiation to the embedder.
		if (Module.instantiateWasm) {
			Module.instantiateWasm(imports, receiveInstance);
			return;
		}

		reject(new Error("This minimal glue requires an instantiateWasm hook"));
	});
}
