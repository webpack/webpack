"use strict";

module.exports = {
	// `runtimeChunk: "single"` splits the entry, so the runtime has to run first.
	findBundle() {
		return ["./runtime.mjs", "./main.mjs"];
	}
};
