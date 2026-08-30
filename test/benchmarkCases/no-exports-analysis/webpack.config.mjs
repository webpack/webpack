/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	optimization: {
		providedExports: false,
		usedExports: false,
		sideEffects: false,
		mangleExports: false,
		innerGraph: false
	}
};
