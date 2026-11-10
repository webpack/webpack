import { answer } from "../nested-runtime/wasm.wat";

import(/* webpackSource: true */ "../nested-runtime/wasm.wat").then((module) => {
	const result = [answer(), new WebAssembly.Instance(module).exports.answer()];
	if (typeof self !== "undefined" && typeof self.postMessage === "function") {
		self.postMessage(result);
	} else {
		import("worker_threads").then(({ parentPort }) => {
			parentPort.postMessage(result);
		});
	}
});
