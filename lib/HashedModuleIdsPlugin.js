"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const crypto = require("crypto");
class HashedModuleIdsPlugin {
	constructor(options) {
		this.options = options || {};
		this.options.hashFunction = this.options.hashFunction || "md5";
		this.options.hashDigest = this.options.hashDigest || "base64";
		this.options.hashDigestLength = this.options.hashDigestLength || 4;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			const usedIds = {};
			compilation.plugin("before-module-ids", (modules) => {
				modules.forEach((module) => {
					if(module.id === null && module.libIdent) {
						let id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
						const hash = crypto.createHash(this.options.hashFunction);
						hash.update(id);
						id = hash.digest(this.options.hashDigest);
						let len = this.options.hashDigestLength;
						while(usedIds[id.substr(0, len)]) {
							len++;
						}
						module.id = id.substr(0, len);
						usedIds[module.id] = true;
					}
				});
			});
		});
	}
}
module.exports = HashedModuleIdsPlugin;
