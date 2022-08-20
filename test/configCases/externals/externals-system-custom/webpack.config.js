/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		libraryTarget: "system"
	},
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externals: {
		rootExt: "root rootExt",
		varExt: "var varExt",
		windowExt: "window windowExt"
	}
};
