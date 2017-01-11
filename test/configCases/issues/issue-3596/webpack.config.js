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
			this.plugin("emit", function(compilation, callback) {
				delete compilation.assets["b.js"];
				callback();
			});
		}
	]
};
