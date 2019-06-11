/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const {
	createFileSerializer,
	NOT_SERIALIZABLE,
	MEASURE_START_OPERATION,
	MEASURE_END_OPERATION
} = require("../util/serialization");

const MAX_INLINE_SIZE = 20000;

class Pack {
	constructor(version, log) {
		this.version = version;
		this.etags = new Map();
		/** @type {Map<string, any | (() => Promise<PackEntry>)>} */
		this.content = new Map();
		this.lastAccess = new Map();
		this.lastSizes = new Map();
		this.unserializable = new Set();
		this.used = new Set();
		this.invalid = false;
		this.log = log;
	}

	get(identifier, etag) {
		const etagInCache = this.etags.get(identifier);
		if (etagInCache === undefined) return undefined;
		if (etagInCache !== etag) return undefined;
		this.used.add(identifier);
		const content = this.content.get(identifier);
		if (typeof content === "function") {
			return Promise.resolve(content()).then(entry =>
				this._unpack(identifier, entry, false)
			);
		} else {
			return content;
		}
	}

	set(identifier, etag, data) {
		if (this.unserializable.has(identifier)) return;
		this.used.add(identifier);
		this.invalid = true;
		this.etags.set(identifier, etag);
		return this.content.set(identifier, data);
	}

	collectGarbage(maxAge) {
		this._updateLastAccess();
		const now = Date.now();
		for (const [identifier, lastAccess] of this.lastAccess) {
			if (now - lastAccess > maxAge) {
				this.lastAccess.delete(identifier);
				this.etags.delete(identifier);
				this.content.delete(identifier);
			}
		}
	}

	setLogLevel(log) {
		this.log = log;
	}

	_updateLastAccess() {
		const now = Date.now();
		for (const identifier of this.used) {
			this.lastAccess.set(identifier, now);
		}
		this.used.clear();
	}

	serialize({ write }) {
		this._updateLastAccess();
		write(this.version);
		write(this.log);
		write(this.etags);
		write(this.unserializable);
		write(this.lastAccess);
		for (const [identifier, data] of this.content) {
			write(identifier);
			if (typeof data === "function") {
				write(data);
			} else {
				const packEntry = new PackEntry(data, this.log, identifier);
				const lastSize = this.lastSizes.get(identifier);
				if (lastSize > MAX_INLINE_SIZE) {
					write(() => packEntry);
				} else {
					write(packEntry);
				}
			}
		}
		write(null);
	}

	deserialize({ read }) {
		this.version = read();
		this.log = read();
		this.etags = read();
		this.unserializable = read();
		this.lastAccess = read();
		this.content = new Map();
		let identifier = read();
		while (identifier !== null) {
			const entry = read();
			if (typeof entry === "function") {
				this.content.set(identifier, entry);
			} else {
				this.content.set(identifier, this._unpack(identifier, entry, true));
			}
			identifier = read();
		}
	}

	_unpack(identifier, entry, currentlyInline) {
		const { data, size } = entry;
		if (data === undefined) {
			this.unserializable.add(identifier);
			this.lastSizes.delete(identifier);
			return undefined;
		} else {
			this.lastSizes.set(identifier, size);
			if (currentlyInline) {
				if (size > MAX_INLINE_SIZE) {
					this.invalid = true;
					if (this.log >= 3) {
						console.warn(
							`Moved ${identifier} from inline to lazy section for better performance.`
						);
					}
				}
			} else {
				if (size <= MAX_INLINE_SIZE) {
					this.content.set(identifier, data);
					this.invalid = true;
					if (this.log >= 3) {
						console.warn(
							`Moved ${identifier} from lazy to inline section for better performance.`
						);
					}
				}
			}
			return data;
		}
	}
}

makeSerializable(Pack, "webpack/lib/cache/PackFileCacheStrategy", "Pack");

class PackEntry {
	constructor(data, log, identifier) {
		this.data = data;
		this.size = undefined;
		this.log = log;
		this.identifier = identifier;
	}

	serialize({ write, snapshot, rollback }) {
		const s = snapshot();
		try {
			write(true);
			if (this.size === undefined) {
				write(MEASURE_START_OPERATION);
				write(this.data);
				write(MEASURE_END_OPERATION);
			} else {
				write(this.data);
				write(this.size);
			}
		} catch (err) {
			if (this.log >= 1 && err !== NOT_SERIALIZABLE) {
				console.warn(
					`Caching failed for ${this.identifier}: ${
						this.log >= 4 ? err.stack : err
					}\nWe will not try to cache this entry again until the cache file is deleted.`
				);
			}
			rollback(s);
			write(false);
		}
	}

	deserialize({ read }) {
		if (read()) {
			this.data = read();
			this.size = read();
		}
	}
}

makeSerializable(
	PackEntry,
	"webpack/lib/cache/PackFileCacheStrategy",
	"PackEntry"
);

class PackFileCacheStrategy {
	constructor({ fs, cacheLocation, version, loglevel }) {
		this.fileSerializer = createFileSerializer(fs);
		this.cacheLocation = cacheLocation;
		const log = loglevel
			? { debug: 4, verbose: 3, info: 2, warning: 1 }[loglevel]
			: 0;
		this.log = log;
		this.packPromise = this.fileSerializer
			.deserialize({ filename: `${cacheLocation}.pack` })
			.then(cacheEntry => {
				if (cacheEntry) {
					if (!(cacheEntry instanceof Pack)) {
						if (log >= 3) {
							console.warn(
								`Restored pack from ${cacheLocation}.pack, but is not a Pack.`
							);
						}
						return new Pack(version, log);
					}
					if (cacheEntry.version !== version) {
						if (log >= 3) {
							console.warn(
								`Restored pack from ${cacheLocation}.pack, but version doesn't match.`
							);
						}
						return new Pack(version, log);
					}
					cacheEntry.setLogLevel(log);
					return cacheEntry;
				}
				return new Pack(version, log);
			})
			.catch(err => {
				if (log >= 1 && err && err.code !== "ENOENT") {
					console.warn(
						`Restoring pack failed from ${cacheLocation}.pack: ${
							log >= 4 ? err.stack : err
						}`
					);
				}
				return new Pack(version, log);
			});
	}

	store(identifier, etag, data, idleTasks) {
		return this.packPromise.then(pack => {
			if (this.log >= 2) {
				console.warn(`Cached ${identifier} to pack.`);
			}
			pack.set(identifier, etag, data);
		});
	}

	restore(identifier, etag) {
		return this.packPromise
			.then(pack => pack.get(identifier, etag))
			.catch(err => {
				if (this.log >= 1 && err && err.code !== "ENOENT") {
					console.warn(
						`Restoring failed for ${identifier} from pack: ${
							this.log >= 4 ? err.stack : err
						}`
					);
				}
			});
	}

	afterAllStored() {
		return this.packPromise.then(pack => {
			if (!pack.invalid) return;
			if (this.log >= 3) {
				console.warn(`Storing pack...`);
			}
			pack.collectGarbage(1000 * 60 * 60 * 24 * 2);
			// You might think this breaks all access to the existing pack
			// which are still referenced, but serializing the pack memorizes
			// all data in the pack and makes it no longer need the backing file
			// So it's safe to replace the pack file
			return this.fileSerializer
				.serialize(pack, {
					filename: `${this.cacheLocation}.pack`
				})
				.then(() => {
					if (this.log >= 3) {
						console.warn(`Stored pack`);
					}
				})
				.catch(err => {
					if (this.log >= 1) {
						console.warn(
							`Caching failed for pack: ${this.log >= 4 ? err.stack : err}`
						);
					}
				});
		});
	}
}

module.exports = PackFileCacheStrategy;
