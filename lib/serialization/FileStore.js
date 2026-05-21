/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { promisify } = require("util");
const {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	brotliCompress,
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	brotliDecompress,
	constants: zConstants,
	gunzip,
	gzip
} = require("zlib");
const { DEFAULTS } = require("../config/defaults");
const createHash = require("../util/createHash");
const { dirname, join, mkdirp } = require("../util/fs");
const memoize = require("../util/memoize");
const Decoder = require("./Decoder");
const Encoder = require("./Encoder");
const {
	createLazy,
	getLazySerializedValue,
	isLazy,
	setLazySerializedValue
} = require("./Lazy");

/** @typedef {import("../util/Hash").HashFunction} HashFunction */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {{ filename: string, extension?: string, [key: string]: EXPECTED_ANY }} FileContext */
/** @typedef {{ name?: string, type?: string }} SeparateOptions */
/** @typedef {{ file: string, buffer: Buffer }} PendingWrite */

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

/**
 * @param {Buffer} buffer buffer
 * @param {HashFunction} hashFunction hash function
 * @returns {string} hash
 */
const hashForName = (buffer, hashFunction) => {
	const hash = createHash(hashFunction);
	hash.update(buffer);
	return hash.digest("hex");
};

/**
 * @param {IntermediateFileSystem} fs filesystem
 * @param {string} path path
 * @returns {Promise<void>} promise
 */
const mkdirpAsync = (fs, path) =>
	/** @type {Promise<void>} */
	new Promise((resolve, reject) => {
		mkdirp(fs, path, (err) => (err ? reject(err) : resolve()));
	});

/**
 * @template T
 * @param {(callback: (err: NodeJS.ErrnoException | null, value?: T) => void) => void} fn fn
 * @returns {Promise<T>} promise
 */
const callback = (fn) =>
	new Promise((resolve, reject) => {
		fn((err, value) => (err ? reject(err) : resolve(/** @type {T} */ (value))));
	});

class FileStore {
	/**
	 * @param {IntermediateFileSystem} fs filesystem
	 * @param {HashFunction=} hashFunction hash function
	 */
	constructor(fs, hashFunction = DEFAULTS.HASH_FUNCTION) {
		this.fs = fs;
		this.hashFunction = hashFunction;
		/** @type {PendingWrite[]} */
		this._pendingWrites = [];
	}

	/**
	 * @param {Buffer} buffer buffer
	 * @param {string} filename filename
	 * @returns {Promise<Buffer>} compressed buffer
	 */
	async _compress(buffer, filename) {
		if (filename.endsWith(".gz")) {
			return gzipAsync(buffer, { level: zConstants.Z_BEST_SPEED });
		}
		if (filename.endsWith(".br")) {
			return brotliCompressAsync(buffer, {
				params: {
					[zConstants.BROTLI_PARAM_MODE]: zConstants.BROTLI_MODE_TEXT,
					[zConstants.BROTLI_PARAM_QUALITY]: 2,
					[zConstants.BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING]: true,
					[zConstants.BROTLI_PARAM_SIZE_HINT]: buffer.length
				}
			});
		}
		return buffer;
	}

	/**
	 * @param {Buffer} buffer buffer
	 * @param {string} filename filename
	 * @returns {Promise<Buffer>} decompressed buffer
	 */
	async _decompress(buffer, filename) {
		if (filename.endsWith(".gz")) return gunzipAsync(buffer);
		if (filename.endsWith(".br")) return brotliDecompressAsync(buffer);
		return buffer;
	}

	/**
	 * @param {string} filename filename
	 * @param {Buffer} buffer buffer
	 * @returns {Promise<void>} promise
	 */
	async writeFileAtomic(filename, buffer) {
		await mkdirpAsync(this.fs, dirname(this.fs, filename));
		const unlink =
			/** @type {NonNullable<IntermediateFileSystem["unlink"]>} */ (
				this.fs.unlink
			);
		const compressed = await this._compress(buffer, filename);
		const temp = `${filename}_`;
		const old = `${filename}.old`;
		await callback((cb) => this.fs.writeFile(temp, compressed, cb));
		await callback((cb) => this.fs.rename(filename, old, () => cb(null))).catch(
			() => {}
		);
		try {
			await callback((cb) => this.fs.rename(temp, filename, cb));
		} catch (err) {
			const code = /** @type {NodeJS.ErrnoException} */ (err).code;
			if (code === "EEXIST" || code === "EPERM") {
				await callback((cb) =>
					unlink.call(this.fs, filename, () => cb(null))
				).catch(() => {});
				await callback((cb) => this.fs.rename(temp, filename, cb));
			} else {
				throw err;
			}
		}
		await callback((cb) => unlink.call(this.fs, old, () => cb(null))).catch(
			() => {}
		);
	}

	/**
	 * @param {string} filename filename
	 * @returns {Promise<Buffer>} buffer
	 */
	async readFile(filename) {
		const buffer = await callback((cb) => this.fs.readFile(filename, cb));
		return this._decompress(Buffer.from(buffer), filename);
	}

	/**
	 * @param {string} baseFilename base filename
	 * @param {string} name name
	 * @param {string=} extension extension
	 * @returns {string} filename
	 */
	_getSeparateFilename(baseFilename, name, extension = "") {
		return join(this.fs, baseFilename, `../${name}${extension}`);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @param {Record<string, EXPECTED_ANY>} context context
	 * @returns {Buffer | null} buffer
	 */
	serializeToBuffer(value, context) {
		return new Encoder({
			context,
			fileStore: this,
			lazyTarget: this
		}).serialize(value);
	}

	/**
	 * @param {Buffer} buffer buffer
	 * @param {Record<string, EXPECTED_ANY>} context context
	 * @returns {EXPECTED_ANY} value
	 */
	deserializeFromBuffer(buffer, context) {
		return new Decoder(buffer, {
			context,
			fileStore: this,
			lazyTarget: this
		}).deserialize();
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @param {FileContext} context context
	 * @returns {Promise<true | null>} promise
	 */
	async serialize(value, context) {
		this._pendingWrites = [];
		const buffer = this.serializeToBuffer(value, context);
		if (buffer === null) return null;
		for (const write of this._pendingWrites) {
			await this.writeFileAtomic(write.file, write.buffer);
		}
		await this.writeFileAtomic(context.filename, buffer);
		return true;
	}

	/**
	 * @param {EXPECTED_ANY} _value value
	 * @param {FileContext} context context
	 * @returns {Promise<EXPECTED_ANY>} promise
	 */
	async deserialize(_value, context) {
		const buffer = await this.readFile(context.filename);
		return this.deserializeFromBuffer(buffer, context);
	}

	/**
	 * @param {Encoder} encoder encoder
	 * @param {EXPECTED_ANY} value value
	 * @param {SeparateOptions=} options options
	 * @returns {{ name: string, size: number, lazy: () => EXPECTED_ANY }} info
	 */
	writeSeparate(encoder, value, options = {}) {
		const lazy = isLazy(value) ? value : createLazy(value, this, options);
		const serialized = /** @type {EXPECTED_ANY} */ (
			getLazySerializedValue(lazy)
		);
		if (serialized && typeof serialized === "object" && serialized.name) {
			return { name: serialized.name, size: serialized.size, lazy };
		}
		const data = lazy();
		if (data && typeof data.then === "function") {
			throw new Error(
				"Async separate serialization is not supported by this encoder"
			);
		}
		if (!encoder.fileStore) {
			throw new Error("Separate value requires a file serializer");
		}
		const buffer = encoder.fileStore.serializeToBuffer(data, encoder.context);
		if (buffer === null) throw new Error("Separate value is not serializable");
		const name = options.name || hashForName(buffer, this.hashFunction);
		const file = this._getSeparateFilename(
			encoder.context.filename,
			name,
			encoder.context.extension
		);
		this._pendingWrites.push({ file, buffer });
		const info = { name, size: buffer.length };
		setLazySerializedValue(lazy, info);
		return { ...info, lazy };
	}

	/**
	 * @param {string} name name
	 * @param {number} size size
	 * @param {Record<string, EXPECTED_ANY>} context context
	 * @returns {() => EXPECTED_ANY} lazy
	 */
	readSeparateLazy(name, size, context) {
		const file = this._getSeparateFilename(
			/** @type {string} */ (context.filename),
			name,
			context.extension
		);
		return createLazy(
			memoize(async () => {
				const buffer = await this.readFile(file);
				return this.deserializeFromBuffer(buffer, context);
			}),
			this,
			{ name, size },
			{ name, size }
		);
	}
}

module.exports = FileStore;
