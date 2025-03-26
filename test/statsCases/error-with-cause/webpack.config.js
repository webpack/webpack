const path = require("path");

/**
 * A Webpack plugin that throws an error with a cause attached.
 */
class ErrorWithCausePlugin {
	/**
	 * Apply the plugin to the Webpack compiler.
	 * @param {import("webpack").Compiler} compiler The Webpack compiler instance.
	 */
	apply(compiler) {
		compiler.hooks.emit.tap("ErrorWithCausePlugin", () => {
			/** @type {Error} */
			const causeError = new Error("Underlying cause of the error");
			/** @type {Error & { cause?: Error }} */
			const mainError = new Error("Main build error");
			mainError.cause = causeError; // Attaching cause to the error
			throw mainError; // Throw the error to see how Webpack handles it
		});
	}
}

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: path.resolve(__dirname, "index.js"), // Dummy entry file
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js"
	},
	plugins: [new ErrorWithCausePlugin()],
	stats: {
		errorDetails: true // Ensure error details are included in stats
	}
};
