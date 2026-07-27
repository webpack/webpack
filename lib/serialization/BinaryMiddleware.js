/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { deserialize: v8Deserialize, serialize: v8Serialize } = require("v8");
const memoize = require("../util/memoize");
const SerializerMiddleware = require("./SerializerMiddleware");

/** @typedef {import("./types").BufferSerializableType} BufferSerializableType */
/** @typedef {import("./types").PrimitiveSerializableType} PrimitiveSerializableType */

/*
Format:

File -> Section*

Section -> ValuesSection | LazySection

ValuesSection ->
	ValuesHeaderByte u32:payloadSize u32:bufferCount (u32:valueIndex u32:bufferSize)*
	payload buffer*
LazySection ->
	LazyHeaderByte u32:count u32:size*

ValuesHeaderByte -> 0xf1
LazyHeaderByte -> 0xf2
*/

const VALUES_HEADER = 0xf1;
const LAZY_HEADER = 0xf2;

const HEADER_SIZE = 1;
const I32_SIZE = 4;

/** A values section is closed once its payload is estimated to reach this size. */
const MAX_SECTION_SIZE = 16 * 1024 * 1024;
/** Assumed encoded size of a value that isn't a string, for that estimate. */
const ESTIMATED_VALUE_SIZE = 4;

const EMPTY_BUFFER = Buffer.alloc(0);

/** Highest V8 value serialization format version this Node.js can read. */
const V8_FORMAT_VERSION = v8Serialize(null)[1];

const MEASURE_START_OPERATION = Symbol("MEASURE_START_OPERATION");
const MEASURE_END_OPERATION = Symbol("MEASURE_END_OPERATION");

/** @typedef {typeof MEASURE_START_OPERATION} MEASURE_START_OPERATION_TYPE */
/** @typedef {typeof MEASURE_END_OPERATION} MEASURE_END_OPERATION_TYPE */

/** @typedef {PrimitiveSerializableType[]} DeserializedType */
/** @typedef {BufferSerializableType[]} SerializedType} */
/** @typedef {{ retainedBuffer?: (x: Buffer) => Buffer }} Context} */

/**
 * Defines the lazy function type used by this module.
 * @template LazyInputValue
 * @template LazyOutputValue
 * @typedef {import("./SerializerMiddleware").LazyFunction<LazyInputValue, LazyOutputValue, BinaryMiddleware, undefined>} LazyFunction
 */

/** Mutable read state of one `_deserialize` run. */
class ReadState {
	/**
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 */
	constructor(data, context) {
		/** @type {SerializedType} */
		this.data = data;
		this.retainedBuffer = context.retainedBuffer || ((x) => x);
		/** @type {number} */
		this.currentDataItem = 0;
		/** @type {BufferSerializableType | null} */
		this.currentBuffer = data.length > 0 ? data[0] : null;
		/** @type {boolean} */
		this.currentIsBuffer = Buffer.isBuffer(this.currentBuffer);
		/** @type {number} */
		this.currentPosition = 0;
	}

	/** Advances to the next data item (does not reset the position). */
	nextDataItem() {
		this.currentDataItem++;
		this.currentBuffer =
			this.currentDataItem < this.data.length
				? this.data[this.currentDataItem]
				: null;
		this.currentIsBuffer = Buffer.isBuffer(this.currentBuffer);
	}

	checkOverflow() {
		if (
			this.currentPosition >= /** @type {Buffer} */ (this.currentBuffer).length
		) {
			this.currentPosition = 0;
			this.nextDataItem();
		}
	}

	/**
	 * Checks whether n bytes are available in the current buffer.
	 * @param {number} n n
	 * @returns {boolean} true when in current buffer, otherwise false
	 */
	isInCurrentBuffer(n) {
		return (
			this.currentIsBuffer &&
			n + this.currentPosition <=
				/** @type {Buffer} */ (this.currentBuffer).length
		);
	}

	ensureBuffer() {
		if (!this.currentIsBuffer) {
			throw new Error(
				this.currentBuffer === null
					? "Unexpected end of stream"
					: "Unexpected lazy element in stream"
			);
		}
	}

	/**
	 * Returns buffer with bytes.
	 * @param {number} n amount of bytes to read
	 * @returns {Buffer} buffer with bytes
	 */
	read(n) {
		if (n === 0) return EMPTY_BUFFER;
		this.ensureBuffer();
		const rem =
			/** @type {Buffer} */ (this.currentBuffer).length - this.currentPosition;
		if (rem < n) {
			const buffers = [this.read(rem)];
			n -= rem;
			this.ensureBuffer();
			while (/** @type {Buffer} */ (this.currentBuffer).length < n) {
				const b = /** @type {Buffer} */ (this.currentBuffer);
				buffers.push(b);
				n -= b.length;
				this.nextDataItem();
				this.ensureBuffer();
			}
			buffers.push(this.read(n));
			return Buffer.concat(buffers);
		}
		const b = /** @type {Buffer} */ (this.currentBuffer);
		const res = Buffer.from(b.buffer, b.byteOffset + this.currentPosition, n);
		this.currentPosition += n;
		this.checkOverflow();
		return res;
	}

	/**
	 * Reads up to n bytes.
	 * @param {number} n amount of bytes to read
	 * @returns {Buffer} buffer with bytes
	 */
	readUpTo(n) {
		this.ensureBuffer();
		const rem =
			/** @type {Buffer} */ (this.currentBuffer).length - this.currentPosition;
		if (rem < n) {
			n = rem;
		}
		const b = /** @type {Buffer} */ (this.currentBuffer);
		const res = Buffer.from(b.buffer, b.byteOffset + this.currentPosition, n);
		this.currentPosition += n;
		this.checkOverflow();
		return res;
	}

	/**
	 * Returns u8.
	 * @returns {number} U8
	 */
	readU8() {
		this.ensureBuffer();
		/**
		 * There is no need to check remaining buffer size here
		 * since {@link ReadState#checkOverflow} guarantees at least one byte remaining
		 */
		const byte =
			/** @type {Buffer} */
			(this.currentBuffer).readUInt8(this.currentPosition);
		this.currentPosition += HEADER_SIZE;
		this.checkOverflow();
		return byte;
	}

	/**
	 * Returns u32.
	 * @returns {number} U32
	 */
	readU32() {
		// fast path avoids allocating a 4-byte view per length read
		if (this.isInCurrentBuffer(I32_SIZE)) {
			const value =
				/** @type {Buffer} */
				(this.currentBuffer).readUInt32LE(this.currentPosition);
			this.currentPosition += I32_SIZE;
			this.checkOverflow();
			return value;
		}
		return this.read(I32_SIZE).readUInt32LE(0);
	}
}

/**
 * Reads a section of values written by V8's value serializer.
 * @param {ReadState} state read state
 * @returns {DeserializedType} values of the section
 */
const readValuesSection = (state) => {
	const payloadSize = state.readU32();
	const bufferCount = state.readU32();
	/** @type {number[]} */
	const bufferInfo = [];
	for (let i = 0; i < bufferCount * 2; i++) bufferInfo.push(state.readU32());
	const payload = state.read(payloadSize);
	// a V8 payload opens with 0xff and its format version, which only ever grows
	if (payload[0] === 0xff && payload[1] > V8_FORMAT_VERSION) {
		throw new Error(
			`Data was written with V8 serialization format version ${payload[1]}, but this Node.js (${process.version}) only reads up to version ${V8_FORMAT_VERSION}`
		);
	}
	const values = /** @type {DeserializedType} */ (v8Deserialize(payload));
	for (let i = 0; i < bufferCount; i++) {
		values[bufferInfo[i * 2]] = state.retainedBuffer(
			state.read(bufferInfo[i * 2 + 1])
		);
	}
	return values;
};

/**
 * Reads the content items of a lazy section.
 * @param {ReadState} state read state
 * @returns {SerializedType} content of the lazy value
 */
const readLazySection = (state) => {
	const count = state.readU32();
	/** @type {number[]} */
	const sizes = [];
	for (let i = 0; i < count; i++) sizes.push(state.readU32());
	/** @type {SerializedType} */
	const content = [];
	for (let size of sizes) {
		if (size === 0) {
			if (typeof state.currentBuffer !== "function") {
				throw new Error("Unexpected non-lazy element in stream");
			}
			content.push(state.currentBuffer);
			state.nextDataItem();
		} else {
			do {
				const buf = state.readUpTo(size);
				size -= buf.length;
				content.push(state.retainedBuffer(buf));
			} while (size > 0);
		}
	}
	return content;
};

/**
 * Represents BinaryMiddleware.
 * @extends {SerializerMiddleware<DeserializedType, SerializedType, Context>}
 */
class BinaryMiddleware extends SerializerMiddleware {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {DeserializedType} data data
	 * @param {Context} context context object
	 * @returns {SerializedType | Promise<SerializedType> | null} serialized data
	 */
	serialize(data, context) {
		return this._serialize(data, context);
	}

	/**
	 * Returns new lazy.
	 * @param {LazyFunction<DeserializedType, SerializedType>} fn lazy function
	 * @param {Context} context serialize function
	 * @returns {LazyFunction<SerializedType, DeserializedType>} new lazy
	 */
	_serializeLazy(fn, context) {
		return SerializerMiddleware.serializeLazy(fn, (data) =>
			this._serialize(data, context)
		);
	}

	/**
	 * Returns serialized data.
	 * @param {DeserializedType} data data
	 * @param {Context} context context object
	 * @returns {SerializedType} serialized data
	 */
	_serialize(data, context) {
		/** @type {SerializedType} */
		const result = [];
		/** @type {number[]} */
		const measureStack = [];
		let writtenBytes = 0;
		/** Index of the first value of the open section. */
		let sectionStart = 0;
		/** Estimated payload size of the open section. */
		let sectionSize = 0;
		/**
		 * Positions of the buffers of the open section, relative to `data`.
		 * @type {number[]}
		 */
		let bufferIndices = [];
		/** @type {Buffer[]} */
		let buffers = [];
		/**
		 * Appends a buffer to the output.
		 * @param {Buffer} buffer buffer
		 */
		const write = (buffer) => {
			writtenBytes += buffer.length;
			result.push(buffer);
		};
		/**
		 * Writes a values section for the given values.
		 * @param {DeserializedType} values values without their buffers
		 * @param {number[]} indices position of each buffer within `values`
		 * @param {Buffer[]} bufferList buffers in the order of `indices`
		 */
		const writeValuesSection = (values, indices, bufferList) => {
			const payload = v8Serialize(values);
			const header = Buffer.allocUnsafe(
				HEADER_SIZE + I32_SIZE * (2 + indices.length * 2)
			);
			header[0] = VALUES_HEADER;
			header.writeUInt32LE(payload.length, HEADER_SIZE);
			header.writeUInt32LE(indices.length, HEADER_SIZE + I32_SIZE);
			let offset = HEADER_SIZE + I32_SIZE * 2;
			for (let i = 0; i < indices.length; i++) {
				header.writeUInt32LE(indices[i], offset);
				header.writeUInt32LE(bufferList[i].length, offset + I32_SIZE);
				offset += I32_SIZE * 2;
			}
			write(header);
			write(payload);
			for (const buffer of bufferList) {
				if (buffer.length > 0) write(buffer);
			}
		};
		/**
		 * Closes the open values section before the value at `end`.
		 * @param {number} end index of the first value not in the section
		 */
		const flush = (end) => {
			if (end > sectionStart) {
				if (
					sectionStart === 0 &&
					end === data.length &&
					// a frozen input can't take the placeholders, so it needs the copy
					(bufferIndices.length === 0 || !Object.isFrozen(data))
				) {
					// the section covers all values: swap the buffers out and back in
					// instead of copying the whole array to place the placeholders
					try {
						for (let i = 0; i < bufferIndices.length; i++) {
							data[bufferIndices[i]] = null;
						}
						writeValuesSection(data, bufferIndices, buffers);
					} finally {
						for (let i = 0; i < bufferIndices.length; i++) {
							data[bufferIndices[i]] = buffers[i];
						}
					}
				} else {
					const values = data.slice(sectionStart, end);
					for (let i = 0; i < bufferIndices.length; i++) {
						const index = bufferIndices[i] - sectionStart;
						bufferIndices[i] = index;
						values[index] = null;
					}
					writeValuesSection(values, bufferIndices, buffers);
				}
				if (bufferIndices.length > 0) {
					bufferIndices = [];
					buffers = [];
				}
			}
			sectionStart = end;
			sectionSize = 0;
		};
		for (let i = 0; i < data.length; i++) {
			const thing = data[i];
			const type = typeof thing;
			if (type === "string") {
				sectionSize += /** @type {string} */ (thing).length;
			} else if (type === "object") {
				// buffers are appended to the section instead of entering the payload
				if (thing !== null) {
					if (!Buffer.isBuffer(thing)) {
						throw new Error(`Unexpected object ${thing} in binary middleware`);
					}
					bufferIndices.push(i);
					buffers.push(thing);
					// count placeholder + bytes so buffer-heavy runs still split
					sectionSize += ESTIMATED_VALUE_SIZE + thing.length;
				} else {
					sectionSize += ESTIMATED_VALUE_SIZE;
				}
			} else if (type === "function") {
				flush(i);
				sectionStart = i + 1;
				if (!SerializerMiddleware.isLazy(thing)) {
					throw new Error(`Unexpected function ${thing}`);
				}
				/** @type {SerializedType | LazyFunction<SerializedType, DeserializedType> | undefined} */
				let serializedData = SerializerMiddleware.getLazySerializedValue(thing);
				if (serializedData === undefined) {
					if (SerializerMiddleware.isLazy(thing, this)) {
						serializedData = this._serialize(
							/** @type {DeserializedType} */ (thing()),
							context
						);
						SerializerMiddleware.setLazySerializedValue(thing, serializedData);
					} else {
						result.push(
							this._serializeLazy(
								/** @type {LazyFunction<DeserializedType, SerializedType>} */
								(thing),
								context
							)
						);
						continue;
					}
				} else if (typeof serializedData === "function") {
					result.push(serializedData);
					continue;
				}
				/** @type {number[]} */
				const sizes = [];
				for (const item of serializedData) {
					/** @type {undefined | number} */
					let last;
					if (typeof item === "function") {
						sizes.push(0);
					} else if (item.length === 0) {
						// ignore
					} else if (
						sizes.length > 0 &&
						(last = sizes[sizes.length - 1]) !== 0
					) {
						const remaining = 0xffffffff - last;
						if (remaining >= item.length) {
							sizes[sizes.length - 1] += item.length;
						} else {
							sizes.push(item.length - remaining);
							sizes[sizes.length - 2] = 0xffffffff;
						}
					} else {
						sizes.push(item.length);
					}
				}
				const header = Buffer.allocUnsafe(
					HEADER_SIZE + I32_SIZE * (1 + sizes.length)
				);
				header[0] = LAZY_HEADER;
				header.writeUInt32LE(sizes.length, HEADER_SIZE);
				for (let j = 0; j < sizes.length; j++) {
					header.writeUInt32LE(sizes[j], HEADER_SIZE + I32_SIZE * (1 + j));
				}
				write(header);
				for (const item of serializedData) {
					if (typeof item === "function") {
						result.push(item);
					} else {
						write(item);
					}
				}
				continue;
			} else if (type === "symbol") {
				flush(i);
				sectionStart = i + 1;
				const operation =
					/** @type {MEASURE_START_OPERATION_TYPE | MEASURE_END_OPERATION_TYPE} */
					(/** @type {unknown} */ (thing));
				if (operation === MEASURE_START_OPERATION) {
					measureStack.push(writtenBytes);
				} else if (operation === MEASURE_END_OPERATION) {
					const size =
						writtenBytes - /** @type {number} */ (measureStack.pop());
					writeValuesSection([size], [], []);
				}
				continue;
			} else {
				sectionSize += ESTIMATED_VALUE_SIZE;
			}
			if (sectionSize >= MAX_SECTION_SIZE) flush(i + 1);
		}
		flush(data.length);
		return result;
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @returns {DeserializedType | Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		return this._deserialize(data, context);
	}

	/**
	 * Create lazy deserialized.
	 * @param {SerializedType} content content
	 * @param {Context} context context object
	 * @returns {LazyFunction<DeserializedType, SerializedType>} lazy function
	 */
	_createLazyDeserialized(content, context) {
		return SerializerMiddleware.createLazy(
			memoize(() => this._deserialize(content, context)),
			this,
			undefined,
			content
		);
	}

	/**
	 * Returns new lazy.
	 * @private
	 * @param {LazyFunction<SerializedType, DeserializedType>} fn lazy function
	 * @param {Context} context context object
	 * @returns {LazyFunction<DeserializedType, SerializedType>} new lazy
	 */
	_deserializeLazy(fn, context) {
		return SerializerMiddleware.deserializeLazy(fn, (data) =>
			this._deserialize(data, context)
		);
	}

	/**
	 * Returns deserialized data.
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @returns {DeserializedType} deserialized data
	 */
	_deserialize(data, context) {
		const state = new ReadState(data, context);
		/** @type {DeserializedType | undefined} */
		let result;
		while (state.currentBuffer !== null) {
			/** @type {DeserializedType} */
			let part;
			if (typeof state.currentBuffer === "function") {
				part = [this._deserializeLazy(state.currentBuffer, context)];
				state.nextDataItem();
			} else {
				const header = state.readU8();
				if (header === VALUES_HEADER) {
					part = readValuesSection(state);
				} else if (header === LAZY_HEADER) {
					part = [
						this._createLazyDeserialized(readLazySection(state), context)
					];
				} else {
					throw new Error(`Unexpected header byte 0x${header.toString(16)}`);
				}
			}
			// a single-section stream needs no copying: reuse its array as the result
			if (result === undefined) {
				result = part;
			} else {
				for (let j = 0; j < part.length; j++) result.push(part[j]);
			}
		}
		return result === undefined ? [] : result;
	}
}

module.exports = BinaryMiddleware;

module.exports.MEASURE_END_OPERATION = MEASURE_END_OPERATION;
module.exports.MEASURE_START_OPERATION = MEASURE_START_OPERATION;
