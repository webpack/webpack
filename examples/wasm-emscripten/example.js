import source programWasm from "./program.wasm";
import createModule from "./emscripten-module";

// webpack fetches and compiles program.wasm through its async WebAssembly
// pipeline (content-hashed, code-split-capable) and hands us the compiled
// WebAssembly.Module. The glue then instantiates it, supplying the imports
// webpack cannot know about.
createModule({
	onLog: (value) => console.log("wasm logged:", value),
	instantiateWasm(imports, receiveInstance) {
		WebAssembly.instantiate(programWasm, imports).then((instance) =>
			receiveInstance(instance, programWasm)
		);
		return {}; // signal that instantiation happens asynchronously
	}
}).then((Module) => {
	console.log("run(10) =", Module.run(10));
});
