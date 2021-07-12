module.exports = {
	output: {
		libraryTarget: "system"
	},
	target: "web",
	externals: {
		rootExt: "root rootExt",
		varExt: "var varExt",
		windowExt: "window windowExt"
	}
};
