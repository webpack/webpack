const WebpackError = require("../../../lib/WebpackError");

/** @type {import("../../../").Configuration} */
module.exports = {
	name: `error cause`,
	mode: "development",
	entry: "./index.js",
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				const errCauseErr = new Error("error with case", {
					cause: new Error("error case")
				});
				compilation.errors.push(errCauseErr);
				compilation.warnings.push(errCauseErr);
				const errCauseErrCauseErr = new Error("error with nested error case", {
					cause: new Error("test", { cause: new Error("nested case") })
				});
				compilation.errors.push(errCauseErrCauseErr);
				compilation.warnings.push(errCauseErrCauseErr);
				const errCauseStr = new Error("error with string case", {
					cause: "string case"
				});
				compilation.errors.push(errCauseStr);
				compilation.warnings.push(errCauseStr);
				const aggregateError = new AggregateError(
					[
						new Error("first error", {
							cause: new Error("cause", {
								cause: new Error("nested cause in errors")
							})
						}),
						"second string error",
						new AggregateError(
							[new Error("nested first"), new Error("nested second")],
							"third nested aggregate error"
						)
					],
					"aggregate error",
					{
						cause: new Error("cause\ncause\ncause", {
							cause: "nested string cause"
						})
					}
				);
				compilation.errors.push(aggregateError);
				compilation.warnings.push(aggregateError);
				const webpackError = new WebpackError("webpack error");
				compilation.errors.push(webpackError);
				compilation.warnings.push(webpackError);
				const webpackErrorCause = new WebpackError("webpack error with case", {
					cause: new Error("cause")
				});
				compilation.errors.push(webpackErrorCause);
				compilation.warnings.push(webpackErrorCause);
			});
		}
	]
};
