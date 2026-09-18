/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	cache: {
		type: "filesystem",
		compression: "gzip",
		// For benchmark stability
		maxMemoryGenerations: 0,
		idleTimeoutForInitialStore: 0
	}
};
