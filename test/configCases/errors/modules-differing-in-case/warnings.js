"use strict";

module.exports = [
	[
		{ moduleName: /^\.\/file\.js\?A$/ },
		new RegExp(
			"^There are multiple modules with names that only differ in casing\\.\\n" +
				"This can lead to unexpected behavior when compiling on a filesystem with other case-semantic\\.\\n" +
				"Use equal casing\\. Compare these module identifiers:\\n" +
				// sorted by identifier, each with a representative importer
				"\\* [^\\n]*[\\\\/]file\\.js\\?A\\n" +
				" {4}Used by 1 module\\(s\\), i\\. e\\.\\n" +
				" {4}[^\\n]*[\\\\/]index\\.js\\n" +
				"\\* [^\\n]*[\\\\/]file\\.js\\?a\\n" +
				" {4}Used by 1 module\\(s\\), i\\. e\\.\\n" +
				" {4}[^\\n]*[\\\\/]index\\.js$"
		)
	]
];
