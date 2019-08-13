/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createHash = require("../util/createHash");
const { join } = require("../util/fs");
const { createFileSerializer } = require("../util/serialization");

class SeparateFilesCacheStrategy {
	constructor({ fs, cacheLocation, version, hashAlgorithm, logger }) {
		this.fs = fs;
		this.fileSerializer = createFileSerializer(fs);
		this.cacheLocation = cacheLocation;
		this.version = version;
		this.logger = logger;
		this.toHash = str => {
			const hash = createHash(hashAlgorithm);
			hash.update(str);
			const digest = hash.digest("hex");
			return `${digest.slice(0, 2)}/${digest.slice(2)}`;
		};
	}

	store(identifier, etag, data) {
		const entry = {
			identifier,
			data: etag ? () => data : data,
			etag,
			version: this.version
		};
		const relativeFilename = this.toHash(identifier) + ".data";
		const filename = join(this.fs, this.cacheLocation, relativeFilename);
		return this.fileSerializer
			.serialize(entry, { filename })
			.then(() => {
				this.logger.debug(`Cached ${identifier} to ${filename}.`);
			})
			.catch(err => {
				this.logger.warn(`Caching failed for ${identifier}: ${err}`);
				this.logger.debug(err.stack);
			});
	}

	restore(identifier, etag) {
		const relativeFilename = this.toHash(identifier) + ".data";
		const filename = join(this.fs, this.cacheLocation, relativeFilename);
		return this.fileSerializer
			.deserialize({ filename })
			.then(cacheEntry => {
				if (cacheEntry === undefined) {
					return;
				}
				if (cacheEntry.identifier !== identifier) {
					this.logger.log(
						`Restored ${identifier} from ${filename}, but identifier doesn't match.`
					);
					return;
				}
				if (cacheEntry.etag !== etag) {
					this.logger.debug(
						`Restored ${identifier} from ${filename}, but etag doesn't match.`
					);
					return;
				}
				if (cacheEntry.version !== this.version) {
					this.logger.log(
						`Restored ${identifier} from ${filename}, but version doesn't match.`
					);
					return;
				}
				this.logger.debug(`Restored ${identifier} from ${filename}.`);
				if (typeof cacheEntry.data === "function") return cacheEntry.data();
				return cacheEntry.data;
			})
			.catch(err => {
				if (err && err.code !== "ENOENT") {
					this.logger.warn(
						`Restoring failed for ${identifier} from ${filename}: ${err}`
					);
					this.logger.debug(err.stack);
				}
			});
	}

	storeBuildDependencies() {}

	afterAllStored() {}
}

module.exports = SeparateFilesCacheStrategy;
