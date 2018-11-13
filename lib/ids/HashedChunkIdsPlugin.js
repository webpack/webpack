/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const createHash = require("../util/createHash");
const NamedChunkIdsPlugin = require("./NamedChunkIdsPlugin");

class HashedChunkIdsPlugin extends NamedChunkIdsPlugin {
	constructor(options) {
		const nameResolver = NamedChunkIdsPlugin.createDefaultNameResolver({});
		const usedIds = new Set();
		const resolver = chunk => {
			const options = this.options;
			const name = nameResolver(chunk);

			if (name) {
				const hash = createHash(options.hashFunction);
				hash.update(name);
				const hashId = hash.digest(options.hashDigest);
				let len = options.hashDigestLength;
				while (usedIds.has(hashId.substr(0, len))) len++;
				const chunkId = hashId.substr(0, len);
				usedIds.add(chunkId);
				return chunkId;
			}

			return null;
		};

		super(resolver);

		this.options = Object.assign(
			{
				hashFunction: "md4",
				hashDigest: "base64",
				hashDigestLength: 4
			},
			options
		);
	}
}

module.exports = HashedChunkIdsPlugin;
