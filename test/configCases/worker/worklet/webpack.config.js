/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].js"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worker: [
						"CSS.paintWorklet.addModule()",
						"CSS.layoutWorklet.addModule()",
						"CSS.animationWorklet.addModule()",
						"*context.audioWorklet.addModule()",
						"*context.foo.bar.audioWorklet.addModule()",
						"*audioWorklet.addModule()",
						// *addModule() is not valid syntax
						"..."
					]
				}
			}
		]
	}
};
