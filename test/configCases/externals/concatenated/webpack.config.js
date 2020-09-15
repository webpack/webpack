/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		externalValue: "var 'abc'",
		externalObject: "var { default: 'default', named: 'named' }",
		externalEsModule:
			"var { __esModule: true, default: 'default', named: 'named' }"
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		mangleExports: true
	}
};
