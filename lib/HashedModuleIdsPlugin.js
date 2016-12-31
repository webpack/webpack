/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class HashedModuleIdsPlugin {
	constructor(options) {
		this.options = Object.assign({
			hashFunction: "md5",
			hashDigest: "base64",
			hashDigestLength: 4
		}, options);
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation) => {
			const usedIds = new Set();
			compilation.plugin("before-module-ids", (modules) => {
				modules.forEach((module) => {
					if(module.id === null && module.libIdent) {
						let id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
						const hash = require("crypto").createHash(options.hashFunction);
						hash.update(id);
						id = hash.digest(options.hashDigest);
						let len = options.hashDigestLength;
						while(usedIds.has(id.substr(0, len)))
							len++;
						module.id = id.substr(0, len);
						usedIds.add(module.id);
					}
				});
			});
		});
	}
}

module.exports = HashedModuleIdsPlugin;
