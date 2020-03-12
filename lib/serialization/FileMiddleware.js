/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const createHash = require("../util/createHash");
const { dirname, join, mkdirp } = require("../util/fs");
const memorize = require("../util/memorize");
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

// "wpc" + 0 in little-endian
const VERSION = 0x00637077;
const hashForName = buffers => {
	const hash = createHash("md4");
	for (const buf of buffers) hash.update(buf);
	return /** @type {string} */ (hash.digest("hex"));
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
			/** @type {Promise<Buffer[] | Buffer | SerializeResult>[]} */ (processedData)
		)
	).map(item => {
		if (Array.isArray(item) || Buffer.isBuffer(item)) return item;

		backgroundJobs.push(item.backgroundJob);
		// create pointer buffer from size and name
		const name = /** @type {string} */ (item.name);
		const nameBuffer = Buffer.from(name);
		const buf = Buffer.allocUnsafe(4 + nameBuffer.length);
		buf.writeUInt32LE(item.size, 0);
		nameBuffer.copy(buf, 4, 0);
		const lazy = resultToLazy.get(item);
		SerializerMiddleware.setLazySerializedValue(lazy, buf);
		return buf;
	});
	const lengths = resolvedData.map(item => {
		if (Array.isArray(item)) {
			let l = 0;
			for (const b of item) l += b.length;
			return l;
		} else if (item) {
			return -item.length;
		} else {
			throw new Error("Unexpected falsy value in resolved data " + item);
		}
	});
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
 * @param {function(string | false): Promise<Buffer>} readFile read content of a file
 * @returns {Promise<BufferSerializableType[]>} deserialized data
 */
const deserialize = async (middleware, name, readFile) => {
	const content = await readFile(name);
	if (content.length === 0) throw new Error("Empty file " + name);
	const version = content.readUInt32LE(0);
	if (version !== VERSION) {
		throw new Error("Invalid file version");
	}
	const sectionCount = content.readUInt32LE(4);
	const lengths = [];
	for (let i = 0; i < sectionCount; i++) {
		lengths.push(content.readInt32LE(8 + 4 * i));
	}
	let position = sectionCount * 4 + 8;
	const result = lengths.map(length => {
		const l = Math.abs(length);
		const section = content.slice(position, position + l);
		position += l;
		if (length < 0) {
			// we clone the buffer here to allow the original content to be garbage collected
			const clone = Buffer.from(section);
			const size = section.readUInt32LE(0);
			const nameBuffer = clone.slice(4);
			const name = nameBuffer.toString();
			return SerializerMiddleware.createLazy(
				memorize(() => deserialize(middleware, name, readFile)),
				middleware,
				{
					name,
					size
				},
				clone
			);
		} else {
			return section;
		}
	});
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
	serialize(data, { filename, extension = "" }) {
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
	deserialize(data, { filename, extension = "" }) {
		const readFile = name =>
			new Promise((resolve, reject) => {
				const file = name
					? join(this.fs, filename, `../${name}${extension}`)
					: filename;
				return this.fs.readFile(file, (err, content) => {
					if (err) return reject(err);
					resolve(content);
				});
			});
		return deserialize(this, false, readFile);
	}
}

module.exports = FileMiddleware;
