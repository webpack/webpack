/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const BaseWasmMainTemplatePlugin = require("../BaseWasmMainTemplatePlugin");

class ReadFileCompileWasmTemplatePlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ReadFileCompileWasmTemplatePlugin",
			compilation => {
				const generateLoadBinaryCode = path => `new Promise(function (resolve, reject) {
					var {readFile} = require("fs");
					var {join} = require("path");

					try {
						readFile(join(__dirname, ${path}), function(err, buffer){
							if (err) return reject(err);

							// Fake fetch response
							resolve({
								arrayBuffer() {
									return Promise.resolve(buffer)
								}
							});
						});
					} catch (err) {
						reject(err);
					}
				});
				`;

				new BaseWasmMainTemplatePlugin().apply(
					compilation.mainTemplate,
					generateLoadBinaryCode
				);
			}
		);
	}
}

module.exports = ReadFileCompileWasmTemplatePlugin;
