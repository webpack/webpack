"use strict";

// The streaming compilers are absent under `bun --bun`, in the jest environment
// and in vm contexts alike, so the runtime takes its non-streaming path and
// never reaches the MIME-type failure a fallback case is about. Both ship
// together on every engine webpack tests, so one check covers either.
module.exports = function supportsWasmStreaming() {
	return (
		typeof WebAssembly !== "undefined" &&
		typeof WebAssembly.instantiateStreaming === "function" &&
		typeof WebAssembly.compileStreaming === "function"
	);
};
