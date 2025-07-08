/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index",
		b: "./b"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		function apply() {
			this.hooks.compilation.tap("TestPlugin", compilation => {
				compilation.hooks.processAssets.tap("TestPlugin", () => {
					delete compilation.assets["b.js"];
				});
			});
		}
	]
};
