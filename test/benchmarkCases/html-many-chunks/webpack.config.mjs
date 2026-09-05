/** @type {import("../../..").Configuration} */
export default {
	entry: "./index.html",
	target: "web",
	experiments: {
		html: true
	},
	// Leave minify off so HtmlModulesPlugin's jsHooks.render isn't drowned by terser.
	optimization: {
		minimize: false
	}
};
