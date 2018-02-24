module.exports = {
	entry: {
		bundle0: "./index",
		b: "./b"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		function() {
			this.hooks.emit.tap("TestPlugin", function(compilation) {
				delete compilation.assets["b.js"];
			});
		}
	]
};
