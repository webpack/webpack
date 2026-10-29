"use strict";

// One error per body, and the message of what the engine threw is its own, so
// only the asset is matched. A cached minify result restores its errors without
// `file`, so the message's `<file> from minimizer-webpack-plugin` names it.
module.exports = [
	/^page-caller\.html from minimizer-webpack-plugin\n[\s\S]*failing CSS minifier/,
	/^page-caller\.html from minimizer-webpack-plugin\n[\s\S]*failing CSS minifier/,
	/^page-builtin\.html from minimizer-webpack-plugin\n/,
	/^page-builtin\.html from minimizer-webpack-plugin\n/,
	/^image-builtin\.svg from minimizer-webpack-plugin\n/
];
