/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { constants } = require("buffer");
const { pipeline } = require("stream");
const {
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	brotliDecompress,
	constants: zConstants,
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	createBrotliCompress,
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	createBrotliDecompress,
	createGunzip,
	createGzip,
	// zstd is only available on Node.js >= 22.15; guarded at use sites
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	createZstdCompress,
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	createZstdDecompress,
	gunzip,
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	zstdDecompress
} = require("zlib");
const { DEFAULTS } = require("../config/defaults");
const createHash = require("../util/createHash");
const { dirname, join, mkdirp } = require("../util/fs");
const memoize = require("../util/memoize");
const SerializerMiddleware = require("./SerializerMiddleware");

/** @import { HashFunction } from "../util/Hash" */
/** @import { IStats, IntermediateFileSystem } from "../util/fs" */
/** @import { BufferSerializableType } from "./types" */

/*
Format:

File -> Header Section*

Version -> u32
AmountOfSections -> u32
SectionSize -> i32 (if less than zero represents lazy value)

Header -> Version AmountOfSections SectionSize*

Buffer -> n bytes
Section -> Buffer

*/

// "wpc" + 1 in little-endian
const VERSION = 0x01637077;
const WRITE_LIMIT_TOTAL = 0x7fff0000;
const WRITE_LIMIT_CHUNK = 511 * 1024 * 1024;
// headers and pointer sections are tiny; anything above this is a corrupt file
const MAX_HEADER_OR_POINTER_SIZE = 256 * 1024 * 1024;

/**
 * Returns hash.
 * @param {Buffer[]} buffers buffers
 * @param {HashFunction} hashFunction hash function to use
 * @returns {string} hash
 */
const hashForName = (buffers, hashFunction) => {
	const hash = createHash(hashFunction);
	for (const buf of buffers) hash.update(buf);
	return hash.digest("hex");
};

const COMPRESSION_CHUNK_SIZE = 100 * 1024 * 1024;
const DECOMPRESSION_CHUNK_SIZE = 100 * 1024 * 1024;

/** @type {(buffer: Buffer, value: number, offset: number) => void} */
const writeUInt64LE = Buffer.prototype.writeBigUInt64LE
	? (buf, value, offset) => {
			buf.writeBigUInt64LE(BigInt(value), offset);
		}
	: (buf, value, offset) => {
			const low = value % 0x100000000;
			const high = (value - low) / 0x100000000;
			buf.writeUInt32LE(low, offset);
			buf.writeUInt32LE(high, offset + 4);
		};

/** @type {(buffer: Buffer, offset: number) => void} */
const readUInt64LE = Buffer.prototype.readBigUInt64LE
	? (buf, offset) => Number(buf.readBigUInt64LE(offset))
	: (buf, offset) => {
			const low = buf.readUInt32LE(offset);
			const high = buf.readUInt32LE(offset + 4);
			return high * 0x100000000 + low;
		};

/** @typedef {Promise<void | void[]>} BackgroundJob */

/**
 * Defines the serialize result type used by this module.
 * @typedef {object} SerializeResult
 * @property {string | false} name
 * @property {number} size
 * @property {BackgroundJob=} backgroundJob
 */

/** @typedef {{ name: string, size: number }} LazyOptions */
/**
 * Defines the lazy function type used by this module.
 * @typedef {import("./SerializerMiddleware").LazyFunction<BufferSerializableType[], Buffer, FileMiddleware, LazyOptions>} LazyFunction
 */

/**
 * Serializes this instance into the provided serializer context.
 * @param {FileMiddleware} middleware this
 * @param {(BufferSerializableType | LazyFunction)[]} data data to be serialized
 * @param {string | boolean} name file base name
 * @param {(name: string | false, buffers: Buffer[], size: number) => Promise<void>} writeFile writes a file
 * @param {HashFunction=} hashFunction hash function to use
 * @param {Set<string>=} retainedNames collects names of files that stay referenced without being rewritten
 * @returns {Promise<SerializeResult>} resulting file pointer and promise
 */
const serialize = async (
	middleware,
	data,
	name,
	writeFile,
	hashFunction = DEFAULTS.HASH_FUNCTION,
	retainedNames = undefined
) => {
	/** @type {(Buffer[] | Buffer | Promise<SerializeResult>)[]} */
	const processedData = [];
	/** @type {WeakMap<SerializeResult, LazyFunction>} */
	const resultToLazy = new WeakMap();
	/** @type {Buffer[] | undefined} */
	let lastBuffers;
	for (const item of await data) {
		if (typeof item === "function") {
			if (!SerializerMiddleware.isLazy(item)) {
				throw new Error("Unexpected function");
			}
			if (!SerializerMiddleware.isLazy(item, middleware)) {
				throw new Error(
					"Unexpected lazy value with non-this target (can't pass through lazy values)"
				);
			}
			lastBuffers = undefined;
			const serializedInfo = SerializerMiddleware.getLazySerializedValue(item);
			if (serializedInfo) {
				if (typeof serializedInfo === "function") {
					throw new Error(
						"Unexpected lazy value with non-this target (can't pass through lazy values)"
					);
				} else {
					if (retainedNames !== undefined) {
						// pointer buffer layout: u64 size + utf-8 file name
						retainedNames.add(serializedInfo.toString("utf8", 8));
					}
					processedData.push(serializedInfo);
				}
			} else {
				const content = item();
				if (content) {
					const options = SerializerMiddleware.getLazyOptions(item);
					processedData.push(
						serialize(
							middleware,
							/** @type {BufferSerializableType[]} */
							(content),
							(options && options.name) || true,
							writeFile,
							hashFunction,
							retainedNames
						).then((result) => {
							/** @type {LazyOptions} */
							(item.options).size = result.size;
							resultToLazy.set(result, item);
							return result;
						})
					);
				} else {
					throw new Error(
						"Unexpected falsy value returned by lazy value function"
					);
				}
			}
		} else if (item) {
			if (lastBuffers) {
				lastBuffers.push(item);
			} else {
				lastBuffers = [item];
				processedData.push(lastBuffers);
			}
		} else {
			throw new Error("Unexpected falsy value in items array");
		}
	}
	/** @type {BackgroundJob[]} */
	const backgroundJobs = [];
	const resolvedData = (await Promise.all(processedData)).map((item) => {
		if (Array.isArray(item) || Buffer.isBuffer(item)) return item;

		backgroundJobs.push(
			/** @type {BackgroundJob} */
			(item.backgroundJob)
		);
		// create pointer buffer from size and name
		const name = /** @type {string} */ (item.name);
		const nameBuffer = Buffer.from(name);
		const buf = Buffer.allocUnsafe(8 + nameBuffer.length);
		writeUInt64LE(buf, item.size, 0);
		nameBuffer.copy(buf, 8, 0);
		const lazy =
			/** @type {LazyFunction} */
			(resultToLazy.get(item));
		SerializerMiddleware.setLazySerializedValue(lazy, buf);
		return buf;
	});
	/** @type {number[]} */
	const lengths = [];
	for (const item of resolvedData) {
		if (Array.isArray(item)) {
			let l = 0;
			for (const b of item) l += b.length;
			while (l > 0x7fffffff) {
				lengths.push(0x7fffffff);
				l -= 0x7fffffff;
			}
			lengths.push(l);
		} else if (item) {
			lengths.push(-item.length);
		} else {
			throw new Error(`Unexpected falsy value in resolved data ${item}`);
		}
	}
	const header = Buffer.allocUnsafe(8 + lengths.length * 4);
	header.writeUInt32LE(VERSION, 0);
	header.writeUInt32LE(lengths.length, 4);
	for (let i = 0; i < lengths.length; i++) {
		header.writeInt32LE(lengths[i], 8 + i * 4);
	}
	/** @type {Buffer[]} */
	const buf = [header];
	for (const item of resolvedData) {
		if (Array.isArray(item)) {
			for (const b of item) buf.push(b);
		} else if (item) {
			buf.push(item);
		}
	}
	if (name === true) {
		name = hashForName(buf, hashFunction);
	}
	let size = 0;
	for (const b of buf) size += b.length;
	backgroundJobs.push(writeFile(name, buf, size));
	return {
		size,
		name,
		backgroundJob:
			backgroundJobs.length === 1
				? backgroundJobs[0]
				: /** @type {BackgroundJob} */ (Promise.all(backgroundJobs))
	};
};

/**
 * Restores this instance from the provided deserializer context.
 * @param {FileMiddleware} middleware this
 * @param {string | false} name filename
 * @param {(name: string | false) => Promise<Buffer[]>} readFile read content of a file
 * @returns {Promise<BufferSerializableType[]>} deserialized data
 */
const deserialize = async (middleware, name, readFile) => {
	const contents = await readFile(name);
	if (contents.length === 0) throw new Error(`Empty file ${name}`);
	let contentsIndex = 0;
	let contentItem = contents[0];
	let contentItemLength = contentItem.length;
	let contentPosition = 0;
	if (contentItemLength === 0) throw new Error(`Empty file ${name}`);
	const nextContent = () => {
		contentsIndex++;
		contentItem = contents[contentsIndex];
		contentItemLength = contentItem.length;
		contentPosition = 0;
	};
	/**
	 * Processes the provided n.
	 * @param {number} n number of bytes to ensure
	 */
	const ensureData = (n) => {
		if (contentPosition === contentItemLength) {
			nextContent();
		}
		while (contentItemLength - contentPosition < n) {
			const remaining = contentItem.subarray(contentPosition);
			let lengthFromNext = n - remaining.length;
			/** @type {Buffer[]} */
			const buffers = [remaining];
			for (let i = contentsIndex + 1; i < contents.length; i++) {
				const l = contents[i].length;
				if (l > lengthFromNext) {
					buffers.push(contents[i].subarray(0, lengthFromNext));
					contents[i] = contents[i].subarray(lengthFromNext);
					lengthFromNext = 0;
					break;
				} else {
					buffers.push(contents[i]);
					contentsIndex = i;
					lengthFromNext -= l;
				}
			}
			if (lengthFromNext > 0) throw new Error("Unexpected end of data");
			contentItem = Buffer.concat(buffers, n);
			contentItemLength = n;
			contentPosition = 0;
		}
	};
	/**
	 * Returns value value.
	 * @returns {number} value value
	 */
	const readUInt32LE = () => {
		ensureData(4);
		const value = contentItem.readUInt32LE(contentPosition);
		contentPosition += 4;
		return value;
	};
	/**
	 * Returns value value.
	 * @returns {number} value value
	 */
	const readInt32LE = () => {
		ensureData(4);
		const value = contentItem.readInt32LE(contentPosition);
		contentPosition += 4;
		return value;
	};
	/**
	 * Returns buffer.
	 * @param {number} l length
	 * @returns {Buffer} buffer
	 */
	const readSlice = (l) => {
		ensureData(l);
		if (contentPosition === 0 && contentItemLength === l) {
			const result = contentItem;
			if (contentsIndex + 1 < contents.length) {
				nextContent();
			} else {
				contentPosition = l;
			}
			return result;
		}
		const result = contentItem.subarray(contentPosition, contentPosition + l);
		contentPosition += l;
		// we clone the buffer here to allow the original content to be garbage collected
		return l * 2 < contentItem.buffer.byteLength ? Buffer.from(result) : result;
	};
	const version = readUInt32LE();
	if (version !== VERSION) {
		throw new Error("Invalid file version");
	}
	const sectionCount = readUInt32LE();
	/** @type {number[]} */
	const lengths = [];
	let lastLengthPositive = false;
	for (let i = 0; i < sectionCount; i++) {
		const value = readInt32LE();
		const valuePositive = value >= 0;
		if (lastLengthPositive && valuePositive) {
			lengths[lengths.length - 1] += value;
		} else {
			lengths.push(value);
			lastLengthPositive = valuePositive;
		}
	}
	/** @type {BufferSerializableType[]} */
	const result = [];
	for (let length of lengths) {
		if (length < 0) {
			const slice = readSlice(-length);
			const size = Number(readUInt64LE(slice, 0));
			const nameBuffer = slice.subarray(8);
			const name = nameBuffer.toString();
			const lazy =
				/** @type {LazyFunction} */
				(
					SerializerMiddleware.createLazy(
						memoize(() => deserialize(middleware, name, readFile)),
						middleware,
						{ name, size },
						slice
					)
				);
			result.push(lazy);
		} else {
			// A section may start exactly at a content-buffer boundary; advance
			// first, then read from the fresh buffer (don't fall through to the
			// `while` below, which would skip it).
			if (contentPosition === contentItemLength) {
				nextContent();
			}
			if (contentPosition !== 0) {
				if (length <= contentItemLength - contentPosition) {
					result.push(
						Buffer.from(
							contentItem.buffer,
							contentItem.byteOffset + contentPosition,
							length
						)
					);
					contentPosition += length;
					length = 0;
				} else {
					const l = contentItemLength - contentPosition;
					result.push(
						Buffer.from(
							contentItem.buffer,
							contentItem.byteOffset + contentPosition,
							l
						)
					);
					length -= l;
					contentPosition = contentItemLength;
				}
			} else if (length >= contentItemLength) {
				result.push(contentItem);
				length -= contentItemLength;
				contentPosition = contentItemLength;
			} else {
				result.push(
					Buffer.from(contentItem.buffer, contentItem.byteOffset, length)
				);
				contentPosition += length;
				length = 0;
			}
			while (length > 0) {
				nextContent();
				if (length >= contentItemLength) {
					result.push(contentItem);
					length -= contentItemLength;
					contentPosition = contentItemLength;
				} else {
					result.push(
						Buffer.from(contentItem.buffer, contentItem.byteOffset, length)
					);
					contentPosition += length;
					length = 0;
				}
			}
		}
	}
	return result;
};

/** @typedef {BufferSerializableType[]} DeserializedType */
/** @typedef {true} SerializedType */
/**
 * `writtenFiles`/`retainedFiles` collect file names (without extension) during
 * `serialize`: files written in this run and files that stay referenced by
 * lazy pointers without being rewritten. Retained files may reference further
 * files on disk not listed here (nested lazy segments); use
 * `getReferencedFilenames` to walk them.
 * @typedef {{ filename: string, extension?: string, writtenFiles?: Set<string>, retainedFiles?: Set<string> }} Context
 */

/**
 * Represents FileMiddleware.
 * @extends {SerializerMiddleware<DeserializedType, SerializedType, Context>}
 */
class FileMiddleware extends SerializerMiddleware {
	/**
	 * Creates an instance of FileMiddleware.
	 * @param {IntermediateFileSystem} fs filesystem
	 * @param {HashFunction} hashFunction hash function to use
	 */
	constructor(fs, hashFunction = DEFAULTS.HASH_FUNCTION) {
		super();
		/** @type {IntermediateFileSystem} */
		this.fs = fs;
		/** @type {HashFunction} */
		this._hashFunction = hashFunction;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {DeserializedType} data data
	 * @param {Context} context context object
	 * @returns {SerializedType | Promise<SerializedType> | null} serialized data
	 */
	serialize(data, context) {
		const { filename, extension = "", writtenFiles, retainedFiles } = context;
		return new Promise((resolve, reject) => {
			mkdirp(this.fs, dirname(this.fs, filename), (err) => {
				if (err) return reject(err);

				// It's important that we don't touch existing files during serialization
				// because serialize may read existing files (when deserializing)
				/** @type {Set<string>} */
				const allWrittenFiles = new Set();
				/**
				 * Processes the provided name.
				 * @param {string | false} name name
				 * @param {Buffer[]} content content
				 * @param {number} size size
				 * @returns {Promise<void>}
				 */
				const writeFile = async (name, content, size) => {
					const file = name
						? join(this.fs, filename, `../${name}${extension}`)
						: filename;
					await new Promise(
						/**
						 * Handles the callback logic for this hook.
						 * @param {(value?: undefined) => void} resolve resolve
						 * @param {(reason?: Error | null) => void} reject reject
						 */
						(resolve, reject) => {
							let stream = this.fs.createWriteStream(`${file}_`);
							/** @type {undefined | import("zlib").Gzip | import("zlib").BrotliCompress | import("zlib").ZstdCompress} */
							let compression;
							if (file.endsWith(".gz")) {
								compression = createGzip({
									chunkSize: COMPRESSION_CHUNK_SIZE,
									level: zConstants.Z_BEST_SPEED
								});
							} else if (file.endsWith(".br")) {
								compression = createBrotliCompress({
									chunkSize: COMPRESSION_CHUNK_SIZE,
									params: {
										[zConstants.BROTLI_PARAM_MODE]: zConstants.BROTLI_MODE_TEXT,
										[zConstants.BROTLI_PARAM_QUALITY]: 2,
										[zConstants.BROTLI_PARAM_DISABLE_LITERAL_CONTEXT_MODELING]: true,
										[zConstants.BROTLI_PARAM_SIZE_HINT]: size
									}
								});
							} else if (file.endsWith(".zst")) {
								// eslint-disable-next-line n/no-unsupported-features/node-builtins
								const levelParam = zConstants.ZSTD_c_compressionLevel;
								// default level 3; some runtimes (e.g. Deno) don't expose ZSTD_CLEVEL_DEFAULT
								// eslint-disable-next-line n/no-unsupported-features/node-builtins
								const defaultLevel = zConstants.ZSTD_CLEVEL_DEFAULT;
								const level = defaultLevel === undefined ? 3 : defaultLevel;
								compression = createZstdCompress({
									chunkSize: COMPRESSION_CHUNK_SIZE,
									params: { [levelParam]: level }
								});
							}
							if (compression) {
								// resolve on the pipeline, not on the transform's "finish":
								// the latter fires before the destination has flushed
								pipeline(compression, stream, (err) => {
									if (err) return reject(err);
									resolve();
								});
								stream = compression;
							} else {
								stream.on("error", (err) => reject(err));
								stream.on("finish", () => resolve());
							}
							// split into chunks for WRITE_LIMIT_CHUNK size
							/** @type {Buffer[]} */
							const chunks = [];
							for (const b of content) {
								if (b.length < WRITE_LIMIT_CHUNK) {
									chunks.push(b);
								} else {
									for (let i = 0; i < b.length; i += WRITE_LIMIT_CHUNK) {
										chunks.push(b.subarray(i, i + WRITE_LIMIT_CHUNK));
									}
								}
							}

							const len = chunks.length;
							let i = 0;
							/**
							 * Processes the provided err.
							 * @param {(Error | null)=} err err
							 */
							const batchWrite = (err) => {
								// will be handled in "on" error handler
								if (err) return;

								if (i === len) {
									stream.end();
									return;
								}

								// queue up a batch of chunks up to the write limit
								// end is exclusive
								let end = i;
								let sum = chunks[end++].length;
								while (end < len) {
									sum += chunks[end].length;
									if (sum > WRITE_LIMIT_TOTAL) break;
									end++;
								}
								while (i < end - 1) {
									stream.write(chunks[i++]);
								}
								stream.write(chunks[i++], batchWrite);
							};
							batchWrite();
						}
					);
					if (name) {
						allWrittenFiles.add(file);
						if (writtenFiles !== undefined) writtenFiles.add(name);
					}
				};

				resolve(
					serialize(
						this,
						data,
						false,
						writeFile,
						this._hashFunction,
						retainedFiles
					).then(async ({ backgroundJob }) => {
						await backgroundJob;

						// Rename the index file to disallow access during inconsistent file state
						await new Promise(
							/**
							 * Handles the callback logic for this hook.
							 * @param {(value?: undefined) => void} resolve resolve
							 */
							(resolve) => {
								this.fs.rename(filename, `${filename}.old`, (_err) => {
									resolve();
								});
							}
						);

						// update all written files
						await Promise.all(
							Array.from(
								allWrittenFiles,
								(file) =>
									new Promise(
										/**
										 * Handles the callback logic for this hook.
										 * @param {(value?: undefined) => void} resolve resolve
										 * @param {(reason?: Error | null) => void} reject reject
										 * @returns {void}
										 */
										(resolve, reject) => {
											this.fs.rename(`${file}_`, file, (err) => {
												if (err) return reject(err);
												resolve();
											});
										}
									)
							)
						);

						// As final step automatically update the index file to have a consistent pack again
						await new Promise(
							/**
							 * Handles the callback logic for this hook.
							 * @param {(value?: undefined) => void} resolve resolve
							 * @returns {void}
							 */
							(resolve) => {
								this.fs.rename(`${filename}_`, filename, (err) => {
									if (err) return reject(err);
									resolve();
								});
							}
						);
						return /** @type {true} */ (true);
					})
				);
			});
		});
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @returns {DeserializedType | Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		const { filename, extension = "" } = context;
		/**
		 * Returns result.
		 * @param {string | boolean} name name
		 * @returns {Promise<Buffer[]>} result
		 */
		const readFile = (name) =>
			new Promise((resolve, reject) => {
				const file = name
					? join(this.fs, filename, `../${name}${extension}`)
					: filename;
				this.fs.stat(file, (err, stats) => {
					if (err) {
						reject(err);
						return;
					}
					let remaining = /** @type {IStats} */ (stats).size;
					/** @type {Buffer | undefined} */
					let currentBuffer;
					/** @type {number | undefined} */
					let currentBufferUsed;
					/** @type {Buffer[]} */
					const buf = [];
					/** @type {import("zlib").Zlib & import("stream").Transform | undefined} */
					let decompression;
					if (file.endsWith(".gz")) {
						decompression = createGunzip({
							chunkSize: DECOMPRESSION_CHUNK_SIZE
						});
					} else if (file.endsWith(".br")) {
						decompression = createBrotliDecompress({
							chunkSize: DECOMPRESSION_CHUNK_SIZE
						});
					} else if (file.endsWith(".zst")) {
						decompression = createZstdDecompress({
							chunkSize: DECOMPRESSION_CHUNK_SIZE
						});
					}
					if (decompression) {
						/** @typedef {(value: Buffer[] | PromiseLike<Buffer[]>) => void} NewResolve */
						/** @typedef {(reason?: Error) => void} NewReject */

						/** @type {NewResolve | undefined} */
						let newResolve;
						/** @type {NewReject | undefined} */
						let newReject;
						resolve(
							Promise.all([
								new Promise((rs, rj) => {
									newResolve = rs;
									newReject = rj;
								}),
								new Promise(
									/**
									 * Handles the chunk size callback for this hook.
									 * @param {(value?: undefined) => void} resolve resolve
									 * @param {(reason?: Error) => void} reject reject
									 */
									(resolve, reject) => {
										decompression.on("data", (chunk) => buf.push(chunk));
										decompression.on("end", () => resolve());
										decompression.on("error", (err) => reject(err));
									}
								)
							]).then(() => buf)
						);
						resolve = /** @type {NewResolve} */ (newResolve);
						reject = /** @type {NewReject} */ (newReject);
					}
					this.fs.open(file, "r", (err, _fd) => {
						if (err) {
							reject(err);
							return;
						}
						const fd = /** @type {number} */ (_fd);
						const read = () => {
							if (currentBuffer === undefined) {
								currentBuffer = Buffer.allocUnsafeSlow(
									Math.min(
										constants.MAX_LENGTH,
										remaining,
										decompression ? DECOMPRESSION_CHUNK_SIZE : Infinity
									)
								);
								currentBufferUsed = 0;
							}
							let readBuffer = currentBuffer;
							let readOffset = /** @type {number} */ (currentBufferUsed);
							let readLength =
								currentBuffer.length -
								/** @type {number} */ (currentBufferUsed);
							// values passed to fs.read must be valid int32 values
							if (readOffset > 0x7fffffff) {
								readBuffer = currentBuffer.subarray(readOffset);
								readOffset = 0;
							}
							if (readLength > 0x7fffffff) {
								readLength = 0x7fffffff;
							}
							this.fs.read(
								fd,
								readBuffer,
								readOffset,
								readLength,
								null,
								(err, bytesRead) => {
									if (err) {
										this.fs.close(fd, () => {
											reject(err);
										});
										return;
									}
									// a file truncated after `stat` reads 0 bytes forever
									if (bytesRead === 0 && remaining > 0) {
										this.fs.close(fd, (err) => {
											reject(
												err || new Error(`Unexpected end of file ${file}`)
											);
										});
										return;
									}
									/** @type {number} */
									(currentBufferUsed) += bytesRead;
									remaining -= bytesRead;
									if (
										currentBufferUsed ===
										/** @type {Buffer} */
										(currentBuffer).length
									) {
										if (decompression) {
											decompression.write(currentBuffer);
										} else {
											buf.push(
												/** @type {Buffer} */
												(currentBuffer)
											);
										}
										currentBuffer = undefined;
										if (remaining === 0) {
											if (decompression) {
												decompression.end();
											}
											this.fs.close(fd, (err) => {
												if (err) {
													reject(err);
													return;
												}
												resolve(buf);
											});
											return;
										}
									}
									read();
								}
							);
						};
						read();
					});
				});
			});
		return deserialize(this, false, readFile);
	}
}

/**
 * Extracts the file names referenced by lazy pointer sections from serialized content.
 * @param {Buffer} buf decompressed file content
 * @returns {string[]} referenced file names (without extension)
 */
const parsePointerNames = (buf) => {
	const version = buf.readUInt32LE(0);
	if (version !== VERSION) {
		throw new Error(`Invalid file version ${version}`);
	}
	const sectionCount = buf.readUInt32LE(4);
	let offset = 8 + sectionCount * 4;
	// a corrupt section table must abort the walk, never silently drop a name
	if (offset > buf.length) {
		throw new Error(`Invalid section count ${sectionCount}`);
	}
	/** @type {string[]} */
	const names = [];
	for (let i = 0; i < sectionCount; i++) {
		const length = buf.readInt32LE(8 + i * 4);
		if (length < 0) {
			// pointer section: u64 size + utf-8 file name
			const end = offset - length;
			if (end > buf.length) {
				throw new Error("Truncated pointer section");
			}
			names.push(buf.toString("utf8", offset + 8, end));
			offset = end;
		} else {
			offset += length;
		}
	}
	if (offset !== buf.length) {
		throw new Error("Section table does not match file size");
	}
	return names;
};

/**
 * Reads the pointer names of a compressed file by decompressing it fully
 * (compressed content cannot be read by byte range).
 * @param {IntermediateFileSystem} fs a file system
 * @param {string} file absolute path of the serialized file
 * @returns {Promise<string[]>} referenced file names (without extension)
 */
const getReferencedFilenamesCompressed = (fs, file) =>
	new Promise((resolve, reject) => {
		fs.readFile(file, (err, rawContent) => {
			if (err) return reject(err);
			/**
			 * Parses the decompressed content.
			 * @param {Error | null} err error
			 * @param {Buffer=} content decompressed content
			 * @returns {void}
			 */
			const onContent = (err, content) => {
				if (err) return reject(err);
				try {
					resolve(parsePointerNames(/** @type {Buffer} */ (content)));
				} catch (err_) {
					reject(/** @type {Error} */ (err_));
				}
			};
			const buf = /** @type {Buffer} */ (rawContent);
			if (file.endsWith(".gz")) {
				gunzip(buf, onContent);
			} else if (file.endsWith(".br")) {
				brotliDecompress(buf, onContent);
			} else {
				if (!zstdDecompress) {
					return reject(
						new Error("zstd decompression requires Node.js >= 22.15.0")
					);
				}
				zstdDecompress(buf, onContent);
			}
		});
	});

/**
 * Reads the pointer names of an uncompressed file by reading only the header
 * and the pointer sections instead of the whole file.
 * @param {IntermediateFileSystem} fs a file system
 * @param {string} file absolute path of the serialized file
 * @returns {Promise<string[]>} referenced file names (without extension)
 */
const getReferencedFilenamesUncompressed = (fs, file) =>
	new Promise((resolve, reject) => {
		fs.open(file, "r", (err, _fd) => {
			if (err) return reject(err);
			const fd = /** @type {number} */ (_fd);
			/**
			 * Closes the file descriptor and rejects.
			 * @param {Error} err error
			 */
			const fail = (err) => {
				fs.close(fd, () => reject(err));
			};
			/**
			 * Reads exactly `length` bytes at `position`.
			 * @param {number} position file position
			 * @param {number} length byte count
			 * @param {(buffer: Buffer) => void} callback called with the filled buffer
			 * @returns {void}
			 */
			const readAt = (position, length, callback) => {
				// corrupt headers can request absurd sizes; must reject, not crash
				if (length > MAX_HEADER_OR_POINTER_SIZE) {
					return fail(new Error(`Invalid section size ${length} in ${file}`));
				}
				/** @type {Buffer} */
				let buffer;
				try {
					buffer = Buffer.allocUnsafe(length);
				} catch (err) {
					return fail(/** @type {Error} */ (err));
				}
				let bytesDone = 0;
				const readMore = () => {
					fs.read(
						fd,
						buffer,
						bytesDone,
						length - bytesDone,
						position + bytesDone,
						(err, bytesRead) => {
							if (err) return fail(err);
							if (bytesRead === 0) {
								return fail(new Error(`Unexpected end of file ${file}`));
							}
							bytesDone += bytesRead;
							if (bytesDone < length) return readMore();
							callback(buffer);
						}
					);
				};
				readMore();
			};
			readAt(0, 8, (header) => {
				const version = header.readUInt32LE(0);
				if (version !== VERSION) {
					return fail(new Error(`Invalid file version ${version}`));
				}
				const sectionCount = header.readUInt32LE(4);
				if (sectionCount === 0) {
					return fs.close(fd, (err) => (err ? reject(err) : resolve([])));
				}
				readAt(8, sectionCount * 4, (lengthsBuffer) => {
					/** @type {{ position: number, length: number }[]} */
					const pointerSections = [];
					let position = 8 + sectionCount * 4;
					for (let i = 0; i < sectionCount; i++) {
						const length = lengthsBuffer.readInt32LE(i * 4);
						if (length < 0) {
							pointerSections.push({ position, length: -length });
							position -= length;
						} else {
							position += length;
						}
					}
					// the section table must account for exactly the whole file,
					// otherwise pointer reads land on wrong bytes and under-report
					fs.stat(file, (err, stats) => {
						if (err) return fail(err);
						const stat = /** @type {import("../util/fs").IStats} */ (stats);
						if (stat.size !== position) {
							return fail(
								new Error(`Section table does not match size of ${file}`)
							);
						}
						/** @type {string[]} */
						const names = [];
						/**
						 * Reads the pointer section at `index`, then the next one.
						 * @param {number} index pointer section index
						 * @returns {void}
						 */
						const readNext = (index) => {
							if (index >= pointerSections.length) {
								return fs.close(fd, (err) =>
									err ? reject(err) : resolve(names)
								);
							}
							const section = pointerSections[index];
							readAt(section.position, section.length, (buffer) => {
								// pointer section: u64 size + utf-8 file name
								names.push(buffer.toString("utf8", 8));
								readNext(index + 1);
							});
						};
						readNext(0);
					});
				});
			});
		});
	});

/**
 * Reads the file names referenced by a serialized file (its lazy pointer sections)
 * without deserializing its content. Referenced files may reference further files.
 * @param {IntermediateFileSystem} fs a file system
 * @param {string} file absolute path of the serialized file
 * @returns {Promise<string[]>} referenced file names (without extension)
 */
const getReferencedFilenames = (fs, file) =>
	file.endsWith(".gz") || file.endsWith(".br") || file.endsWith(".zst")
		? getReferencedFilenamesCompressed(fs, file)
		: getReferencedFilenamesUncompressed(fs, file);

// Exposed for testing the content-buffer boundary handling in `deserialize`.
FileMiddleware._deserialize = deserialize;
FileMiddleware.getReferencedFilenames = getReferencedFilenames;

module.exports = FileMiddleware;
