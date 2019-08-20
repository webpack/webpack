var path = require("path");

let devtool = "source-map";

if (process.env.PACKAGE === "development") {
	// cheap-eval-source-map build fast to support development
	devtool = "cheap-eval-source-map";
}

module.exports = {
	mode: "development",
	entry: {
		bundle: "coffee-loader!./example.coffee"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: `./[name]-${devtool}.js`
	},
	devtool,
	optimization: {
		runtimeChunk: true
	}
};
