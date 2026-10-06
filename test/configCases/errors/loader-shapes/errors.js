"use strict";

/**
 * @param {string} text the expected message, as a regexp source
 * @returns {RegExp} the whole message, allowing only stack frames after it
 */
const failed = (text) =>
	new RegExp(`^Module build failed${text}(?:\\n {4}at [^\\n]*)*$`);

module.exports = [
	// a loader module that throws while it is required
	[
		failed(
			" \\(from \\./module-level-throw-loader\\.js\\):\\nError: thrown while the loader module is loaded"
		)
	],
	[
		failed(
			" \\(from \\./async-error-loader\\.js\\):\\nError: passed to the async callback"
		)
	],
	// `emitError` with an Error instance keeps only its message
	[
		{
			moduleName: /^\.\/emit-error-loader\.js!\.\/file\.js$/,
			moduleTrace: /"originName":"\.\/index\.js".*"loc":"19:\d+-\d+"/
		},
		/^Module Error \(from \.\/emit-error-loader\.js\):\nthis is an error$/
	],
	// `null` and an Error without a message, emitted; then a thrown string
	[
		/^Module Error \(from \.\/irregular-error-loader\.js\):\n\(Emitted value instead of an instance of Error\) null$/
	],
	[/^Module Error \(from \.\/irregular-error-loader\.js\):\nError$/],
	[
		failed(
			" \\(from \\./irregular-error-loader\\.js\\):\\nNonErrorEmittedError: \\(Emitted value instead of an instance of Error\\) a string error"
		)
	],
	[
		failed(
			": Error: Final loader \\(\\./no-return-loader\\.js\\) didn't return a Buffer or String"
		)
	],
	[
		failed(
			" \\(from \\./pitch-throw-loader\\.js\\):\\nError: thrown from pitch"
		)
	],
	[
		failed(
			" \\(from \\./raw-throw-loader\\.js\\):\\nError: thrown from a raw loader"
		)
	],
	// an unresolvable loader is reported like any unresolvable request
	[/^Module not found: Error: Can't resolve '\.\/missing-loader' in '[^']*'$/],
	// a third-party loader's own error keeps its class name
	[
		/^Module build failed \(from [^)]*[\\/]json-loader[\\/]index\.js\):\nSyntaxError: /
	]
];
