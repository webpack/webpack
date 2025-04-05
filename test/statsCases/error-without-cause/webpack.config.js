// test/statsCases/error-without-cause/webpack.config.js
/**
 * A Webpack plugin that throws an error without a cause attached.
 */
class ErrorWithoutCausePlugin {
	/**
	 * Apply the plugin to the Webpack compiler.
	 * @param {import("webpack").Compiler} compiler The Webpack compiler instance.
	 */
	apply(compiler) {
		compiler.hooks.emit.tap("ErrorWithoutCausePlugin", () => {
			throw new Error("Main build error without cause");
		});
	}
}

/** @type {import("webpack").Configuration} */
module.exports = {
	entry: "./index.js", // Dummy entry file
	plugins: [new ErrorWithoutCausePlugin()],
	stats: {
		errorDetails: true // Ensure error details are included in stats
	}
};
