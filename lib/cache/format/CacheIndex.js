/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");

/** @typedef {import("../../Cache").Etag} Etag */
/** @typedef {import("../../FileSystemInfo").ResolveResults} ResolveResults */
/** @typedef {import("../../FileSystemInfo").Snapshot} Snapshot */
/** @typedef {import("../../serialization/Encoder")} ObjectSerializerContext */
/** @typedef {import("../../serialization/Decoder")} ObjectDeserializerContext */
/** @typedef {Set<string>} BuildDependencies */

const CACHE_FORMAT_VERSION = 1;

class CacheIndexEntry {
	/**
	 * @param {string=} identifier identifier
	 * @param {string | null=} etag etag
	 * @param {number=} segmentId segment id
	 * @param {number=} lastAccess last access
	 */
	constructor(identifier = "", etag = null, segmentId = -1, lastAccess = 0) {
		this.identifier = identifier;
		this.etag = etag;
		this.segmentId = segmentId;
		this.lastAccess = lastAccess;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 * @returns {void}
	 */
	serialize({ write }) {
		write(this.identifier);
		write(this.etag);
		write(this.segmentId);
		write(this.lastAccess);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {void}
	 */
	deserialize({ read }) {
		this.identifier = read();
		this.etag = read();
		this.segmentId = read();
		this.lastAccess = read();
	}
}

makeSerializable(
	CacheIndexEntry,
	"webpack/lib/cache/format/CacheIndex",
	"CacheIndexEntry"
);

class CacheSegmentInfo {
	/**
	 * @param {number=} id id
	 * @param {string=} filename filename
	 * @param {number=} size size
	 * @param {Set<string>=} items items
	 */
	constructor(id = 0, filename = "", size = 0, items = new Set()) {
		this.id = id;
		this.filename = filename;
		this.size = size;
		this.items = items;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 * @returns {void}
	 */
	serialize({ write }) {
		write(this.id);
		write(this.filename);
		write(this.size);
		write(this.items);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {void}
	 */
	deserialize({ read }) {
		this.id = read();
		this.filename = read();
		this.size = read();
		this.items = read();
	}
}

makeSerializable(
	CacheSegmentInfo,
	"webpack/lib/cache/format/CacheIndex",
	"CacheSegmentInfo"
);

class CacheIndex {
	/**
	 * @param {string=} version version
	 */
	constructor(version = "") {
		this.version = version;
		/** @type {Snapshot | undefined} */
		this.buildSnapshot = undefined;
		/** @type {BuildDependencies} */
		this.buildDependencies = new Set();
		/** @type {ResolveResults | undefined} */
		this.resolveResults = undefined;
		/** @type {Snapshot | undefined} */
		this.resolveBuildDependenciesSnapshot = undefined;
		/** @type {number} */
		this.nextSegmentId = 0;
		/** @type {Map<string, CacheIndexEntry>} */
		this.entries = new Map();
		/** @type {Map<number, CacheSegmentInfo>} */
		this.segments = new Map();
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 * @returns {void}
	 */
	serialize({ write }) {
		write(this.version);
		write(this.buildSnapshot);
		write(this.buildDependencies);
		write(this.resolveResults);
		write(this.resolveBuildDependenciesSnapshot);
		write(this.nextSegmentId);
		write(this.entries);
		write(this.segments);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {void}
	 */
	deserialize({ read }) {
		this.version = read();
		this.buildSnapshot = read();
		this.buildDependencies = read();
		this.resolveResults = read();
		this.resolveBuildDependenciesSnapshot = read();
		this.nextSegmentId = read();
		this.entries = read();
		this.segments = read();
	}
}

makeSerializable(
	CacheIndex,
	"webpack/lib/cache/format/CacheIndex",
	"CacheIndex"
);

module.exports = {
	CACHE_FORMAT_VERSION,
	CacheIndex,
	CacheIndexEntry,
	CacheSegmentInfo
};
