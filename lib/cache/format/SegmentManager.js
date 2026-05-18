/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { join } = require("../../util/fs");
const { CacheIndexEntry, CacheSegmentInfo } = require("./CacheIndex");
const CacheSegment = require("./CacheSegment");

/** @typedef {import("../../Cache").Data} Data */
/** @typedef {import("../../logging/Logger").Logger} Logger */
/** @typedef {import("../../serialization/FileStore")} FileStore */
/** @typedef {import("../../util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("./CacheIndex").CacheIndex} CacheIndex */

/**
 * @template T
 * @param {(callback: (err: NodeJS.ErrnoException | null, value?: T) => void) => void} fn fn
 * @returns {Promise<T>} promise
 */
const callback = (fn) =>
	new Promise((resolve, reject) => {
		fn((err, value) => (err ? reject(err) : resolve(/** @type {T} */ (value))));
	});

class SegmentManager {
	/**
	 * @param {object} options options
	 * @param {IntermediateFileSystem} options.fs filesystem
	 * @param {FileStore} options.fileSerializer serializer
	 * @param {string} options.cacheLocation cache location
	 * @param {false | "gzip" | "brotli" | undefined} options.compression compression
	 * @param {Logger} options.logger logger
	 * @param {boolean | undefined} options.profile profile
	 * @param {number} options.maxAge max age
	 */
	constructor({
		fs,
		fileSerializer,
		cacheLocation,
		compression,
		logger,
		profile,
		maxAge
	}) {
		this.fs = fs;
		this.fileSerializer = fileSerializer;
		this.cacheLocation = cacheLocation;
		this.extension =
			compression === "brotli" ? ".br" : compression === "gzip" ? ".gz" : "";
		this.logger = logger;
		this.profile = profile;
		this.maxAge = maxAge;
		/** @type {Map<number, Promise<Map<string, Data>>>} */
		this.loadedSegments = new Map();
	}

	/**
	 * @param {number} id id
	 * @returns {string} basename
	 */
	segmentBasename(id) {
		return `seg-${`${id}`.padStart(4, "0")}.bin${this.extension}`;
	}

	/**
	 * @param {string} basename basename
	 * @returns {string} path
	 */
	segmentPath(basename) {
		return join(this.fs, this.cacheLocation, basename);
	}

	/**
	 * @param {CacheIndex} index index
	 * @param {Map<string, { etag: string | null, data: Data }>} fresh fresh entries
	 * @returns {Promise<void>} promise
	 */
	async persistFreshContent(index, fresh) {
		if (fresh.size === 0) return;
		const id = index.nextSegmentId++;
		const basename = this.segmentBasename(id);
		const filename = this.segmentPath(basename);
		/** @type {Map<string, Data>} */
		const map = new Map();
		const items = new Set();
		const now = Date.now();
		for (const [identifier, entry] of fresh) {
			map.set(identifier, entry.data);
			items.add(identifier);
			index.entries.set(
				identifier,
				new CacheIndexEntry(identifier, entry.etag, id, now)
			);
		}
		await this.fileSerializer.serialize(new CacheSegment(map), {
			filename,
			logger: this.logger,
			profile: this.profile
		});
		let size = 0;
		try {
			const stats = await callback((cb) => this.fs.stat(filename, cb));
			size = stats.size;
		} catch (_err) {
			size = 0;
		}
		index.segments.set(id, new CacheSegmentInfo(id, basename, size, items));
		this.loadedSegments.set(id, Promise.resolve(map));
		this.logger.log(
			"%d fresh cache items stored in immutable segment %s",
			fresh.size,
			basename
		);
		fresh.clear();
	}

	/**
	 * @param {CacheIndex} index index
	 * @param {number} id segment id
	 * @returns {Promise<Map<string, Data>>} segment map
	 */
	loadSegment(index, id) {
		const existing = this.loadedSegments.get(id);
		if (existing) return existing;
		const info = index.segments.get(id);
		if (!info) return Promise.resolve(new Map());
		const promise = this.fileSerializer
			.deserialize(null, {
				filename: this.segmentPath(info.filename),
				logger: this.logger,
				profile: this.profile
			})
			.then((segment) => {
				if (segment instanceof CacheSegment) return segment.items;
				this.logger.warn(
					"Restored cache segment %s, but contained content is unexpected.",
					info.filename
				);
				return new Map();
			});
		this.loadedSegments.set(id, promise);
		return promise;
	}

	/**
	 * @param {CacheIndex} index index
	 * @returns {void}
	 */
	gc(index) {
		const now = Date.now();
		let removed = 0;
		for (const [identifier, entry] of index.entries) {
			if (now - entry.lastAccess > this.maxAge) {
				index.entries.delete(identifier);
				const segment = index.segments.get(entry.segmentId);
				if (segment) segment.items.delete(identifier);
				removed++;
			}
		}
		for (const [id, segment] of index.segments) {
			if (segment.items.size === 0) {
				index.segments.delete(id);
				this.loadedSegments.delete(id);
			}
		}
		if (removed > 0) {
			this.logger.log(
				"Garbage collected %d old filesystem cache items",
				removed
			);
		}
	}

	/**
	 * Compacts at most one sparse segment.
	 * @param {CacheIndex} index index
	 * @returns {Promise<void>} promise
	 */
	async compactOne(index) {
		for (const [id, segment] of index.segments) {
			const live = [...segment.items].filter((identifier) => {
				const entry = index.entries.get(identifier);
				return entry && entry.segmentId === id;
			});
			if (live.length === segment.items.size || live.length === 0) continue;
			if (live.length / segment.items.size > 0.5) continue;
			const oldMap = await this.loadSegment(index, id);
			/** @type {Map<string, { etag: string | null, data: Data }>} */
			const fresh = new Map();
			for (const identifier of live) {
				const entry = index.entries.get(identifier);
				if (!entry) continue;
				fresh.set(identifier, {
					etag: entry.etag,
					data: oldMap.get(identifier)
				});
			}
			index.segments.delete(id);
			this.loadedSegments.delete(id);
			await this.persistFreshContent(index, fresh);
			this.logger.log(
				"Compacted sparse filesystem cache segment %s (%d survivors)",
				segment.filename,
				live.length
			);
			return;
		}
	}

	/**
	 * @param {CacheIndex} index index
	 * @returns {Promise<void>} promise
	 */
	async sweepOrphans(index) {
		/** @type {string[]} */
		let files;
		try {
			files = await callback((cb) => this.fs.readdir(this.cacheLocation, cb));
		} catch (_err) {
			return;
		}
		const unlink = this.fs.unlink;
		if (unlink === undefined) return;
		const live = new Set([...index.segments.values()].map((s) => s.filename));
		await Promise.all(
			files.map(async (file) => {
				if (
					file.endsWith("_") ||
					file.endsWith(".tmp") ||
					(/^seg-\d+\.bin(?:\.(?:gz|br))?$/.test(file) && !live.has(file))
				) {
					await callback((cb) =>
						unlink.call(this.fs, join(this.fs, this.cacheLocation, file), () =>
							cb(null)
						)
					).catch(() => {});
				}
			})
		);
	}
}

module.exports = SegmentManager;
