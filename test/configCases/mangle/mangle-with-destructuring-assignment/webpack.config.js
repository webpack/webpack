/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				resourceQuery: /side-effects/,
				sideEffects: true
			}
		]
	},
	optimization: {
		mangleExports: true,
		usedExports: true,
		providedExports: true
	}
};
