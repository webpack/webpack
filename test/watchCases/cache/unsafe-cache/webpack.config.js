/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory"
	},
	module: {
		unsafeCache: true
	},
	externals: {
		external: "var 123"
	}
};
