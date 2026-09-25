/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	cache: {
		type: "filesystem",
		compression: "brotli",
		// For benchmark stability
		maxMemoryGenerations: 0,
		idleTimeoutForInitialStore: 0
	}
};
