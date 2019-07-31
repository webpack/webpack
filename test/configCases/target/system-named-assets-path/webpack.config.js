module.exports = {
	output: {
		library: "named-system-module-[name]",
		libraryTarget: "system"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
