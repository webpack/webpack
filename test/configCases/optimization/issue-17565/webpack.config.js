/** @type {import("../../../../").Configuration} */
module.exports = (env, argv) => {
	const mode = "production";

	return {
		optimization: {
			innerGraph: true,
			sideEffects: true,
			minimize: true
		},
		mode: mode,
		entry: "./index.js",
		target: "web"
	};
};
