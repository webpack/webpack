"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class WebEnvironmentPlugin {
	constructor(inputFileSystem, outputFileSystem) {
		this.inputFileSystem = inputFileSystem;
		this.outputFileSystem = outputFileSystem;
	}

	apply(compiler) {
		compiler.inputFileSystem = this.inputFileSystem;
		compiler.outputFileSystem = this.outputFileSystem;
	}
}
module.exports = WebEnvironmentPlugin;
