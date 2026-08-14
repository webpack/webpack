/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	module: {
		parser: {
			json: {
				exportsDepth: Infinity
			}
		}
	}
};
