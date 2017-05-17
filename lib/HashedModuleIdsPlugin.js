/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const createHash = require("crypto").createHash;

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
						const id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
						const hash = createHash(options.hashFunction);
						hash.update(id);
						const hashId = hash.digest(options.hashDigest);
						let len = options.hashDigestLength;
						while(usedIds.has(hashId.substr(0, len)))
							len++;
						module.id = hashId.substr(0, len);
						usedIds.add(module.id);
					}
				});
			});
		});
	}
}

module.exports = HashedModuleIdsPlugin;
