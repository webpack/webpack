/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createHash = require("../util/createHash");
const { join } = require("../util/fs");
const { createFileSerializer } = require("../util/serialization");

class SeparateFilesCacheStrategy {
	constructor({ fs, cacheLocation, version, hashAlgorithm, loglevel }) {
		this.fs = fs;
		this.fileSerializer = createFileSerializer(fs);
		this.cacheLocation = cacheLocation;
		this.version = version;
		this.log = loglevel
			? { debug: 4, verbose: 3, info: 2, warning: 1 }[loglevel]
			: 0;
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
				if (this.log >= 2) {
					console.warn(`Cached ${identifier} to ${filename}.`);
				}
			})
			.catch(err => {
				if (this.log >= 1) {
					console.warn(
						`Caching failed for ${identifier}: ${
							this.log >= 3 ? err.stack : err
						}`
					);
				}
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
					if (this.log >= 3) {
						console.warn(
							`Restored ${identifier} from ${filename}, but identifier doesn't match.`
						);
					}
					return;
				}
				if (cacheEntry.etag !== etag) {
					if (this.log >= 3) {
						console.warn(
							`Restored ${identifier} from ${filename}, but etag doesn't match.`
						);
					}
					return;
				}
				if (cacheEntry.version !== this.version) {
					if (this.log >= 3) {
						console.warn(
							`Restored ${identifier} from ${filename}, but version doesn't match.`
						);
					}
					return;
				}
				if (this.log >= 3) {
					console.warn(`Restored ${identifier} from ${filename}.`);
				}
				if (typeof cacheEntry.data === "function") return cacheEntry.data();
				return cacheEntry.data;
			})
			.catch(err => {
				if (this.log >= 1 && err && err.code !== "ENOENT") {
					console.warn(
						`Restoring failed for ${identifier} from ${filename}: ${
							this.log >= 4 ? err.stack : err
						}`
					);
				}
			});
	}

	afterAllStored() {}
}

module.exports = SeparateFilesCacheStrategy;
