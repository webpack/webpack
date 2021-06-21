/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { constants } = require("buffer");
const createHash = require("../util/createHash");
const { dirname, join, mkdirp } = require("../util/fs");
const memoize = require("../util/memoize");
const SerializerMiddleware = require("./SerializerMiddleware");

/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("./types").BufferSerializableType} BufferSerializableType */

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
const hashForName = buffers => {
	const hash = createHash("md4");
	for (const buf of buffers) hash.update(buf);
	return /** @type {string} */ (hash.digest("hex"));
};

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

const readUInt64LE = Buffer.prototype.readBigUInt64LE
	? (buf, offset) => {
			return Number(buf.readBigUInt64LE(offset));
	  }
	: (buf, offset) => {
			const low = buf.readUInt32LE(offset);
			const high = buf.readUInt32LE(offset + 4);
			return high * 0x100000000 + low;
	  };

/**
 * @typedef {Object} SerializeResult
 * @property {string | false} name
 * @property {number} size
 * @property {Promise=} backgroundJob
 */

/**
 * @param {FileMiddleware} middleware this
 * @param {BufferSerializableType[] | Promise<BufferSerializableType[]>} data data to be serialized
 * @param {string | boolean} name file base name
 * @param {function(string | false, Buffer[]): Promise} writeFile writes a file
 * @returns {Promise<SerializeResult>} resulting file pointer and promise
 */
const serialize = async (middleware, data, name, writeFile) => {
	/** @type {(Buffer[] | Buffer | SerializeResult | Promise<SerializeResult>)[]} */
	const processedData = [];
	/** @type {WeakMap<SerializeResult, function(): any | Promise<any>>} */
	const resultToLazy = new WeakMap();
	/** @type {Buffer[]} */
	let lastBuffers = undefined;
	for (const item of await data) {
		if (typeof item === "function") {
			if (!SerializerMiddleware.isLazy(item))
				throw new Error("Unexpected function");
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
					processedData.push(serializedInfo);
				}
			} else {
				const content = item();
				if (content) {
					const options = SerializerMiddleware.getLazyOptions(item);
					processedData.push(
						serialize(
							middleware,
							content,
							(options && options.name) || true,
							writeFile
						).then(result => {
							/** @type {any} */ (item).options.size = result.size;
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
	/** @type {Promise<any>[]} */
	const backgroundJobs = [];
	const resolvedData = (
		await Promise.all(
			/** @type {Promise<Buffer[] | Buffer | SerializeResult>[]} */ (
				processedData
			)
		)
	).map(item => {
		if (Array.isArray(item) || Buffer.isBuffer(item)) return item;

		backgroundJobs.push(item.backgroundJob);
		// create pointer buffer from size and name
		const name = /** @type {string} */ (item.name);
		const nameBuffer = Buffer.from(name);
		const buf = Buffer.allocUnsafe(8 + nameBuffer.length);
		writeUInt64LE(buf, item.size, 0);
		nameBuffer.copy(buf, 8, 0);
		const lazy = resultToLazy.get(item);
		SerializerMiddleware.setLazySerializedValue(lazy, buf);
		return buf;
	});
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
			throw new Error("Unexpected falsy value in resolved data " + item);
		}
	}
	const header = Buffer.allocUnsafe(8 + lengths.length * 4);
	header.writeUInt32LE(VERSION, 0);
	header.writeUInt32LE(lengths.length, 4);
	for (let i = 0; i < lengths.length; i++) {
		header.writeInt32LE(lengths[i], 8 + i * 4);
	}
	const buf = [header];
	for (const item of resolvedData) {
		if (Array.isArray(item)) {
			for (const b of item) buf.push(b);
		} else if (item) {
			buf.push(item);
		}
	}
	if (name === true) {
		name = hashForName(buf);
	}
	backgroundJobs.push(writeFile(name, buf));
	let size = 0;
	for (const b of buf) size += b.length;
	return {
		size,
		name,
		backgroundJob:
			backgroundJobs.length === 1
				? backgroundJobs[0]
				: Promise.all(backgroundJobs)
	};
};

/**
 * @param {FileMiddleware} middleware this
 * @param {string | false} name filename
 * @param {function(string | false): Promise<Buffer[]>} readFile read content of a file
 * @returns {Promise<BufferSerializableType[]>} deserialized data
 */
const deserialize = async (middleware, name, readFile) => {
	const contents = await readFile(name);
	if (contents.length === 0) throw new Error("Empty file " + name);
	let contentsIndex = 0;
	let contentItem = contents[0];
	let contentItemLength = contentItem.length;
	let contentPosition = 0;
	if (contentItemLength === 0) throw new Error("Empty file " + name);
	const nextContent = () => {
		contentsIndex++;
		contentItem = contents[contentsIndex];
		contentItemLength = contentItem.length;
		contentPosition = 0;
	};
	const ensureData = n => {
		if (contentPosition === contentItemLength) {
			nextContent();
		}
		while (contentItemLength - contentPosition < n) {
			const remaining = contentItem.slice(contentPosition);
			let lengthFromNext = n - remaining.length;
			const buffers = [remaining];
			for (let i = contentsIndex + 1; i < contents.length; i++) {
				const l = contents[i].length;
				if (l > lengthFromNext) {
					buffers.push(contents[i].slice(0, lengthFromNext));
					contents[i] = contents[i].slice(lengthFromNext);
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
	const readUInt32LE = () => {
		ensureData(4);
		const value = contentItem.readUInt32LE(contentPosition);
		contentPosition += 4;
		return value;
	};
	const readInt32LE = () => {
		ensureData(4);
		const value = contentItem.readInt32LE(contentPosition);
		contentPosition += 4;
		return value;
	};
	const readSlice = l => {
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
		const result = contentItem.slice(contentPosition, contentPosition + l);
		contentPosition += l;
		// we clone the buffer here to allow the original content to be garbage collected
		return l * 2 < contentItem.buffer.byteLength ? Buffer.from(result) : result;
	};
	const version = readUInt32LE();
	if (version !== VERSION) {
		throw new Error("Invalid file version");
	}
	const sectionCount = readUInt32LE();
	const lengths = [];
	for (let i = 0; i < sectionCount; i++) {
		lengths.push(readInt32LE());
	}
	const result = [];
	for (let length of lengths) {
		if (length < 0) {
			const slice = readSlice(-length);
			const size = Number(readUInt64LE(slice, 0));
			const nameBuffer = slice.slice(8);
			const name = nameBuffer.toString();
			result.push(
				SerializerMiddleware.createLazy(
					memoize(() => deserialize(middleware, name, readFile)),
					middleware,
					{
						name,
						size
					},
					slice
				)
			);
		} else {
			if (contentPosition === contentItemLength) {
				nextContent();
			} else if (contentPosition !== 0) {
				if (length <= contentItemLength - contentPosition) {
					result.push(
						contentItem.slice(contentPosition, contentPosition + length)
					);
					contentPosition += length;
					length = 0;
				} else {
					result.push(contentItem.slice(contentPosition));
					length -= contentItemLength - contentPosition;
					contentPosition = contentItemLength;
				}
			} else {
				if (length >= contentItemLength) {
					result.push(contentItem);
					length -= contentItemLength;
					contentPosition = contentItemLength;
				} else {
					result.push(contentItem.slice(0, length));
					contentPosition += length;
					length = 0;
				}
			}
			while (length > 0) {
				nextContent();
				if (length >= contentItemLength) {
					result.push(contentItem);
					length -= contentItemLength;
					contentPosition = contentItemLength;
				} else {
					result.push(contentItem.slice(0, length));
					contentPosition += length;
					length = 0;
				}
			}
		}
	}
	return result;
};

/**
 * @typedef {BufferSerializableType[]} DeserializedType
 * @typedef {true} SerializedType
 * @extends {SerializerMiddleware<DeserializedType, SerializedType>}
 */
class FileMiddleware extends SerializerMiddleware {
	/**
	 * @param {IntermediateFileSystem} fs filesystem
	 */
	constructor(fs) {
		super();
		this.fs = fs;
	}
	/**
	 * @param {DeserializedType} data data
	 * @param {Object} context context object
	 * @returns {SerializedType|Promise<SerializedType>} serialized data
	 */
	serialize(data, context) {
		const { filename, extension = "" } = context;
		return new Promise((resolve, reject) => {
			mkdirp(this.fs, dirname(this.fs, filename), err => {
				if (err) return reject(err);

				// It's important that we don't touch existing files during serialization
				// because serialize may read existing files (when deserializing)
				const allWrittenFiles = new Set();
				const writeFile = async (name, content) => {
					const file = name
						? join(this.fs, filename, `../${name}${extension}`)
						: filename;
					await new Promise((resolve, reject) => {
						const stream = this.fs.createWriteStream(file + "_");
						for (const b of content) stream.write(b);
						stream.end();
						stream.on("error", err => reject(err));
						stream.on("finish", () => resolve());
					});
					if (name) allWrittenFiles.add(file);
				};

				resolve(
					serialize(this, data, false, writeFile).then(
						async ({ backgroundJob }) => {
							await backgroundJob;

							// Rename the index file to disallow access during inconsistent file state
							await new Promise(resolve =>
								this.fs.rename(filename, filename + ".old", err => {
									resolve();
								})
							);

							// update all written files
							await Promise.all(
								Array.from(
									allWrittenFiles,
									file =>
										new Promise((resolve, reject) => {
											this.fs.rename(file + "_", file, err => {
												if (err) return reject(err);
												resolve();
											});
										})
								)
							);

							// As final step automatically update the index file to have a consistent pack again
							await new Promise(resolve => {
								this.fs.rename(filename + "_", filename, err => {
									if (err) return reject(err);
									resolve();
								});
							});
							return /** @type {true} */ (true);
						}
					)
				);
			});
		});
	}

	/**
	 * @param {SerializedType} data data
	 * @param {Object} context context object
	 * @returns {DeserializedType|Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		const { filename, extension = "" } = context;
		const readFile = name =>
			new Promise((resolve, reject) => {
				const file = name
					? join(this.fs, filename, `../${name}${extension}`)
					: filename;
				this.fs.stat(file, (err, stats) => {
					if (err) {
						reject(err);
						return;
					}
					let remaining = /** @type {number} */ (stats.size);
					let currentBuffer;
					let currentBufferUsed;
					const buf = [];
					this.fs.open(file, "r", (err, fd) => {
						if (err) {
							reject(err);
							return;
						}
						const read = () => {
							if (currentBuffer === undefined) {
								currentBuffer = Buffer.allocUnsafeSlow(
									Math.min(constants.MAX_LENGTH, remaining)
								);
								currentBufferUsed = 0;
							}
							let readBuffer = currentBuffer;
							let readOffset = currentBufferUsed;
							let readLength = currentBuffer.length - currentBufferUsed;
							if (readOffset > 0x7fffffff) {
								readBuffer = currentBuffer.slice(readOffset);
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
									currentBufferUsed += bytesRead;
									remaining -= bytesRead;
									if (currentBufferUsed === currentBuffer.length) {
										buf.push(currentBuffer);
										currentBuffer = undefined;
										if (remaining === 0) {
											this.fs.close(fd, err => {
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

module.exports = FileMiddleware;
