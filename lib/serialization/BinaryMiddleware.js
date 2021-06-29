/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");
const SerializerMiddleware = require("./SerializerMiddleware");

/** @typedef {import("./types").BufferSerializableType} BufferSerializableType */
/** @typedef {import("./types").PrimitiveSerializableType} PrimitiveSerializableType */

/* eslint-disable no-loop-func */

/*
Format:

File -> Section*

Section -> NullsSection |
					 BooleansSection |
					 F64NumbersSection |
					 I32NumbersSection |
					 I8NumbersSection |
					 ShortStringSection |
					 StringSection |
					 BufferSection |
					 NopSection



NullsSection ->
	NullHeaderByte | Null2HeaderByte | Null3HeaderByte |
	Nulls8HeaderByte 0xnn (n:count - 4) |
	Nulls32HeaderByte n:ui32 (n:count - 260) |
BooleansSection -> TrueHeaderByte | FalseHeaderByte | BooleansSectionHeaderByte BooleansCountAndBitsByte
F64NumbersSection -> F64NumbersSectionHeaderByte f64*
I32NumbersSection -> I32NumbersSectionHeaderByte i32*
I8NumbersSection -> I8NumbersSectionHeaderByte i8*
ShortStringSection -> ShortStringSectionHeaderByte ascii-byte*
StringSection -> StringSectionHeaderByte i32:length utf8-byte*
BufferSection -> BufferSectionHeaderByte i32:length byte*
NopSection --> NopSectionHeaderByte

ShortStringSectionHeaderByte -> 0b1nnn_nnnn (n:length)

F64NumbersSectionHeaderByte -> 0b001n_nnnn (n:count - 1)
I32NumbersSectionHeaderByte -> 0b010n_nnnn (n:count - 1)
I8NumbersSectionHeaderByte -> 0b011n_nnnn (n:count - 1)

NullsSectionHeaderByte -> 0b0001_nnnn (n:count - 1)
BooleansCountAndBitsByte ->
	0b0000_1xxx (count = 3) |
	0b0001_xxxx (count = 4) |
	0b001x_xxxx (count = 5) |
	0b01xx_xxxx (count = 6) |
	0b1nnn_nnnn (n:count - 7, 7 <= count <= 133)
	0xff n:ui32 (n:count, 134 <= count < 2^32)

StringSectionHeaderByte -> 0b0000_1110
BufferSectionHeaderByte -> 0b0000_1111
NopSectionHeaderByte -> 0b0000_1011
FalseHeaderByte -> 0b0000_1100
TrueHeaderByte -> 0b0000_1101

RawNumber -> n (n <= 10)

*/

const LAZY_HEADER = 0x0b;
const TRUE_HEADER = 0x0c;
const FALSE_HEADER = 0x0d;
const BOOLEANS_HEADER = 0x0e;
const NULL_HEADER = 0x10;
const NULL2_HEADER = 0x11;
const NULL3_HEADER = 0x12;
const NULLS8_HEADER = 0x13;
const NULLS32_HEADER = 0x14;
const NULL_AND_I8_HEADER = 0x15;
const NULL_AND_I32_HEADER = 0x16;
const NULL_AND_TRUE_HEADER = 0x17;
const NULL_AND_FALSE_HEADER = 0x18;
const STRING_HEADER = 0x1e;
const BUFFER_HEADER = 0x1f;
const I8_HEADER = 0x60;
const I32_HEADER = 0x40;
const F64_HEADER = 0x20;
const SHORT_STRING_HEADER = 0x80;

/** Uplift high-order bits */
const NUMBERS_HEADER_MASK = 0xe0;
const NUMBERS_COUNT_MASK = 0x1f; // 0b0001_1111
const SHORT_STRING_LENGTH_MASK = 0x7f; // 0b0111_1111

const HEADER_SIZE = 1;
const I8_SIZE = 1;
const I32_SIZE = 4;
const F64_SIZE = 8;

const MEASURE_START_OPERATION = Symbol("MEASURE_START_OPERATION");
const MEASURE_END_OPERATION = Symbol("MEASURE_END_OPERATION");

/** @typedef {typeof MEASURE_START_OPERATION} MEASURE_START_OPERATION_TYPE */
/** @typedef {typeof MEASURE_END_OPERATION} MEASURE_END_OPERATION_TYPE */

const identifyNumber = n => {
	if (n === (n | 0)) {
		if (n <= 127 && n >= -128) return 0;
		if (n <= 2147483647 && n >= -2147483648) return 1;
	}
	return 2;
};

/**
 * @typedef {PrimitiveSerializableType[]} DeserializedType
 * @typedef {BufferSerializableType[]} SerializedType
 * @extends {SerializerMiddleware<DeserializedType, SerializedType>}
 */
class BinaryMiddleware extends SerializerMiddleware {
	/**
	 * @param {DeserializedType} data data
	 * @param {Object} context context object
	 * @returns {SerializedType|Promise<SerializedType>} serialized data
	 */
	serialize(data, context) {
		return this._serialize(data, context);
	}

	_serializeLazy(fn, context) {
		return SerializerMiddleware.serializeLazy(fn, data =>
			this._serialize(data, context)
		);
	}

	/**
	 * @param {DeserializedType} data data
	 * @param {Object} context context object
	 * @returns {SerializedType} serialized data
	 */
	_serialize(data, context) {
		/** @type {Buffer} */
		let currentBuffer = null;
		/** @type {Buffer} */
		let leftOverBuffer = null;
		let currentPosition = 0;
		/** @type {BufferSerializableType[]} */
		let buffers = [];
		let buffersTotalLength = 0;
		const allocate = bytesNeeded => {
			if (currentBuffer !== null) {
				if (currentBuffer.length - currentPosition >= bytesNeeded) return;
				flush();
			}
			if (leftOverBuffer && leftOverBuffer.length >= bytesNeeded) {
				currentBuffer = leftOverBuffer;
				leftOverBuffer = null;
			} else {
				currentBuffer = Buffer.allocUnsafe(
					Math.max(
						bytesNeeded,
						Math.min(Math.max(buffersTotalLength, 1024), 16384)
					)
				);
			}
		};
		const flush = () => {
			if (currentBuffer !== null) {
				buffers.push(
					Buffer.from(
						currentBuffer.buffer,
						currentBuffer.byteOffset,
						currentPosition
					)
				);
				if (
					!leftOverBuffer ||
					leftOverBuffer.length < currentBuffer.length - currentPosition
				) {
					leftOverBuffer = Buffer.from(
						currentBuffer.buffer,
						currentBuffer.byteOffset + currentPosition,
						currentBuffer.byteLength - currentPosition
					);
				}
				currentBuffer = null;
				buffersTotalLength += currentPosition;
				currentPosition = 0;
			}
		};
		const writeU8 = byte => {
			currentBuffer.writeUInt8(byte, currentPosition++);
		};
		const writeU32 = ui32 => {
			currentBuffer.writeUInt32LE(ui32, currentPosition);
			currentPosition += 4;
		};
		const measureStack = [];
		const measureStart = () => {
			measureStack.push(buffers.length, currentPosition);
		};
		const measureEnd = () => {
			const oldPos = measureStack.pop();
			const buffersIndex = measureStack.pop();
			let size = currentPosition - oldPos;
			for (let i = buffersIndex; i < buffers.length; i++) {
				size += buffers[i].length;
			}
			return size;
		};
		const serializeData = data => {
			for (let i = 0; i < data.length; i++) {
				const thing = data[i];
				switch (typeof thing) {
					case "function": {
						if (!SerializerMiddleware.isLazy(thing))
							throw new Error("Unexpected function " + thing);
						/** @type {SerializedType | (() => SerializedType)} */
						let serializedData =
							SerializerMiddleware.getLazySerializedValue(thing);
						if (serializedData === undefined) {
							if (SerializerMiddleware.isLazy(thing, this)) {
								const data = this._serialize(thing(), context);
								SerializerMiddleware.setLazySerializedValue(thing, data);
								serializedData = data;
							} else {
								serializedData = this._serializeLazy(thing, context);
							}
						}
						if (typeof serializedData === "function") {
							flush();
							buffers.push(serializedData);
						} else {
							const lengths = [];
							for (const item of serializedData) {
								let last;
								if (typeof item === "function") {
									lengths.push(0);
								} else if (item.length === 0) {
									// ignore
								} else if (
									lengths.length > 0 &&
									(last = lengths[lengths.length - 1]) !== 0
								) {
									const remaining = 0xffffffff - last;
									if (remaining >= item.length) {
										lengths[lengths.length - 1] += item.length;
									} else {
										lengths.push(item.length - remaining);
										lengths[lengths.length - 2] = 0xffffffff;
									}
								} else {
									lengths.push(item.length);
								}
							}
							allocate(5 + lengths.length * 4);
							writeU8(LAZY_HEADER);
							writeU32(lengths.length);
							for (const l of lengths) {
								writeU32(l);
							}
							flush();
							for (const item of serializedData) {
								buffers.push(item);
							}
						}
						break;
					}
					case "string": {
						const len = Buffer.byteLength(thing);
						if (len >= 128 || len !== thing.length) {
							allocate(len + HEADER_SIZE + I32_SIZE);
							writeU8(STRING_HEADER);
							writeU32(len);
							currentBuffer.write(thing, currentPosition);
						} else {
							allocate(len + HEADER_SIZE);
							writeU8(SHORT_STRING_HEADER | len);
							currentBuffer.write(thing, currentPosition, "latin1");
						}
						currentPosition += len;
						break;
					}
					case "number": {
						const type = identifyNumber(thing);
						if (type === 0 && thing >= 0 && thing <= 10) {
							// shortcut for very small numbers
							allocate(I8_SIZE);
							writeU8(thing);
							break;
						}
						/**
						 * amount of numbers to write
						 * @type {number}
						 */
						let n = 1;
						for (; n < 32 && i + n < data.length; n++) {
							const item = data[i + n];
							if (typeof item !== "number") break;
							if (identifyNumber(item) !== type) break;
						}
						switch (type) {
							case 0:
								allocate(HEADER_SIZE + I8_SIZE * n);
								writeU8(I8_HEADER | (n - 1));
								while (n > 0) {
									currentBuffer.writeInt8(
										/** @type {number} */ (data[i]),
										currentPosition
									);
									currentPosition += I8_SIZE;
									n--;
									i++;
								}
								break;
							case 1:
								allocate(HEADER_SIZE + I32_SIZE * n);
								writeU8(I32_HEADER | (n - 1));
								while (n > 0) {
									currentBuffer.writeInt32LE(
										/** @type {number} */ (data[i]),
										currentPosition
									);
									currentPosition += I32_SIZE;
									n--;
									i++;
								}
								break;
							case 2:
								allocate(HEADER_SIZE + F64_SIZE * n);
								writeU8(F64_HEADER | (n - 1));
								while (n > 0) {
									currentBuffer.writeDoubleLE(
										/** @type {number} */ (data[i]),
										currentPosition
									);
									currentPosition += F64_SIZE;
									n--;
									i++;
								}
								break;
						}

						i--;
						break;
					}
					case "boolean": {
						let lastByte = thing === true ? 1 : 0;
						const bytes = [];
						let count = 1;
						let n;
						for (n = 1; n < 0xffffffff && i + n < data.length; n++) {
							const item = data[i + n];
							if (typeof item !== "boolean") break;
							const pos = count & 0x7;
							if (pos === 0) {
								bytes.push(lastByte);
								lastByte = item === true ? 1 : 0;
							} else if (item === true) {
								lastByte |= 1 << pos;
							}
							count++;
						}
						i += count - 1;
						if (count === 1) {
							allocate(HEADER_SIZE);
							writeU8(lastByte === 1 ? TRUE_HEADER : FALSE_HEADER);
						} else if (count === 2) {
							allocate(HEADER_SIZE * 2);
							writeU8(lastByte & 1 ? TRUE_HEADER : FALSE_HEADER);
							writeU8(lastByte & 2 ? TRUE_HEADER : FALSE_HEADER);
						} else if (count <= 6) {
							allocate(HEADER_SIZE + I8_SIZE);
							writeU8(BOOLEANS_HEADER);
							writeU8((1 << count) | lastByte);
						} else if (count <= 133) {
							allocate(
								HEADER_SIZE + I8_SIZE + I8_SIZE * bytes.length + I8_SIZE
							);
							writeU8(BOOLEANS_HEADER);
							writeU8(0x80 | (count - 7));
							for (const byte of bytes) writeU8(byte);
							writeU8(lastByte);
						} else {
							allocate(
								HEADER_SIZE +
									I8_SIZE +
									I32_SIZE +
									I8_SIZE * bytes.length +
									I8_SIZE
							);
							writeU8(BOOLEANS_HEADER);
							writeU8(0xff);
							writeU32(count);
							for (const byte of bytes) writeU8(byte);
							writeU8(lastByte);
						}
						break;
					}
					case "object": {
						if (thing === null) {
							let n;
							for (n = 1; n < 0x100000104 && i + n < data.length; n++) {
								const item = data[i + n];
								if (item !== null) break;
							}
							i += n - 1;
							if (n === 1) {
								if (i + 1 < data.length) {
									const next = data[i + 1];
									if (next === true) {
										allocate(HEADER_SIZE);
										writeU8(NULL_AND_TRUE_HEADER);
										i++;
									} else if (next === false) {
										allocate(HEADER_SIZE);
										writeU8(NULL_AND_FALSE_HEADER);
										i++;
									} else if (typeof next === "number") {
										const type = identifyNumber(next);
										if (type === 0) {
											allocate(HEADER_SIZE + I8_SIZE);
											writeU8(NULL_AND_I8_HEADER);
											currentBuffer.writeInt8(next, currentPosition);
											currentPosition += I8_SIZE;
											i++;
										} else if (type === 1) {
											allocate(HEADER_SIZE + I32_SIZE);
											writeU8(NULL_AND_I32_HEADER);
											currentBuffer.writeInt32LE(next, currentPosition);
											currentPosition += I32_SIZE;
											i++;
										} else {
											allocate(HEADER_SIZE);
											writeU8(NULL_HEADER);
										}
									} else {
										allocate(HEADER_SIZE);
										writeU8(NULL_HEADER);
									}
								} else {
									allocate(HEADER_SIZE);
									writeU8(NULL_HEADER);
								}
							} else if (n === 2) {
								allocate(HEADER_SIZE);
								writeU8(NULL2_HEADER);
							} else if (n === 3) {
								allocate(HEADER_SIZE);
								writeU8(NULL3_HEADER);
							} else if (n < 260) {
								allocate(HEADER_SIZE + I8_SIZE);
								writeU8(NULLS8_HEADER);
								writeU8(n - 4);
							} else {
								allocate(HEADER_SIZE + I32_SIZE);
								writeU8(NULLS32_HEADER);
								writeU32(n - 260);
							}
						} else if (Buffer.isBuffer(thing)) {
							if (thing.length < 8192) {
								allocate(HEADER_SIZE + I32_SIZE + thing.length);
								writeU8(BUFFER_HEADER);
								writeU32(thing.length);
								thing.copy(currentBuffer, currentPosition);
								currentPosition += thing.length;
							} else {
								allocate(HEADER_SIZE + I32_SIZE);
								writeU8(BUFFER_HEADER);
								writeU32(thing.length);
								flush();
								buffers.push(thing);
							}
						}
						break;
					}
					case "symbol": {
						if (thing === MEASURE_START_OPERATION) {
							measureStart();
						} else if (thing === MEASURE_END_OPERATION) {
							const size = measureEnd();
							allocate(HEADER_SIZE + I32_SIZE);
							writeU8(I32_HEADER);
							currentBuffer.writeInt32LE(size, currentPosition);
							currentPosition += I32_SIZE;
						}
						break;
					}
				}
			}
		};
		serializeData(data);
		flush();

		// avoid leaking memory
		currentBuffer = null;
		leftOverBuffer = null;
		const _buffers = buffers;
		buffers = undefined;
		return _buffers;
	}

	/**
	 * @param {SerializedType} data data
	 * @param {Object} context context object
	 * @returns {DeserializedType|Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		return this._deserialize(data, context);
	}

	_createLazyDeserialized(content, context) {
		return SerializerMiddleware.createLazy(
			memoize(() => this._deserialize(content, context)),
			this,
			undefined,
			content
		);
	}

	_deserializeLazy(fn, context) {
		return SerializerMiddleware.deserializeLazy(fn, data =>
			this._deserialize(data, context)
		);
	}

	/**
	 * @param {SerializedType} data data
	 * @param {Object} context context object
	 * @returns {DeserializedType} deserialized data
	 */
	_deserialize(data, context) {
		let currentDataItem = 0;
		let currentBuffer = data[0];
		let currentIsBuffer = Buffer.isBuffer(currentBuffer);
		let currentPosition = 0;

		const retainedBuffer = context.retainedBuffer || (x => x);

		const checkOverflow = () => {
			if (currentPosition >= currentBuffer.length) {
				currentPosition = 0;
				currentDataItem++;
				currentBuffer =
					currentDataItem < data.length ? data[currentDataItem] : null;
				currentIsBuffer = Buffer.isBuffer(currentBuffer);
			}
		};
		const isInCurrentBuffer = n => {
			return currentIsBuffer && n + currentPosition <= currentBuffer.length;
		};
		const ensureBuffer = () => {
			if (!currentIsBuffer) {
				throw new Error(
					currentBuffer === null
						? "Unexpected end of stream"
						: "Unexpected lazy element in stream"
				);
			}
		};
		/**
		 * Reads n bytes
		 * @param {number} n amount of bytes to read
		 * @returns {Buffer} buffer with bytes
		 */
		const read = n => {
			ensureBuffer();
			const rem = currentBuffer.length - currentPosition;
			if (rem < n) {
				const buffers = [read(rem)];
				n -= rem;
				ensureBuffer();
				while (currentBuffer.length < n) {
					const b = /** @type {Buffer} */ (currentBuffer);
					buffers.push(b);
					n -= b.length;
					currentDataItem++;
					currentBuffer =
						currentDataItem < data.length ? data[currentDataItem] : null;
					currentIsBuffer = Buffer.isBuffer(currentBuffer);
					ensureBuffer();
				}
				buffers.push(read(n));
				return Buffer.concat(buffers);
			}
			const b = /** @type {Buffer} */ (currentBuffer);
			const res = Buffer.from(b.buffer, b.byteOffset + currentPosition, n);
			currentPosition += n;
			checkOverflow();
			return res;
		};
		/**
		 * Reads up to n bytes
		 * @param {number} n amount of bytes to read
		 * @returns {Buffer} buffer with bytes
		 */
		const readUpTo = n => {
			ensureBuffer();
			const rem = currentBuffer.length - currentPosition;
			if (rem < n) {
				n = rem;
			}
			const b = /** @type {Buffer} */ (currentBuffer);
			const res = Buffer.from(b.buffer, b.byteOffset + currentPosition, n);
			currentPosition += n;
			checkOverflow();
			return res;
		};
		const readU8 = () => {
			ensureBuffer();
			/**
			 * There is no need to check remaining buffer size here
			 * since {@link checkOverflow} guarantees at least one byte remaining
			 */
			const byte = /** @type {Buffer} */ (currentBuffer).readUInt8(
				currentPosition
			);
			currentPosition += I8_SIZE;
			checkOverflow();
			return byte;
		};
		const readU32 = () => {
			return read(I32_SIZE).readUInt32LE(0);
		};
		const readBits = (data, n) => {
			let mask = 1;
			while (n !== 0) {
				result.push((data & mask) !== 0);
				mask = mask << 1;
				n--;
			}
		};
		const dispatchTable = Array.from({ length: 256 }).map((_, header) => {
			switch (header) {
				case LAZY_HEADER:
					return () => {
						const count = readU32();
						const lengths = Array.from({ length: count }).map(() => readU32());
						const content = [];
						for (let l of lengths) {
							if (l === 0) {
								if (typeof currentBuffer !== "function") {
									throw new Error("Unexpected non-lazy element in stream");
								}
								content.push(currentBuffer);
								currentDataItem++;
								currentBuffer =
									currentDataItem < data.length ? data[currentDataItem] : null;
								currentIsBuffer = Buffer.isBuffer(currentBuffer);
							} else {
								do {
									const buf = readUpTo(l);
									l -= buf.length;
									content.push(retainedBuffer(buf));
								} while (l > 0);
							}
						}
						result.push(this._createLazyDeserialized(content, context));
					};
				case BUFFER_HEADER:
					return () => {
						const len = readU32();
						result.push(retainedBuffer(read(len)));
					};
				case TRUE_HEADER:
					return () => result.push(true);
				case FALSE_HEADER:
					return () => result.push(false);
				case NULL3_HEADER:
					return () => result.push(null, null, null);
				case NULL2_HEADER:
					return () => result.push(null, null);
				case NULL_HEADER:
					return () => result.push(null);
				case NULL_AND_TRUE_HEADER:
					return () => result.push(null, true);
				case NULL_AND_FALSE_HEADER:
					return () => result.push(null, false);
				case NULL_AND_I8_HEADER:
					return () => {
						if (currentIsBuffer) {
							result.push(
								null,
								/** @type {Buffer} */ (currentBuffer).readInt8(currentPosition)
							);
							currentPosition += I8_SIZE;
							checkOverflow();
						} else {
							result.push(null, read(I8_SIZE).readInt8(0));
						}
					};
				case NULL_AND_I32_HEADER:
					return () => {
						result.push(null);
						if (isInCurrentBuffer(I32_SIZE)) {
							result.push(
								/** @type {Buffer} */ (currentBuffer).readInt32LE(
									currentPosition
								)
							);
							currentPosition += I32_SIZE;
							checkOverflow();
						} else {
							result.push(read(I32_SIZE).readInt32LE(0));
						}
					};
				case NULLS8_HEADER:
					return () => {
						const len = readU8() + 4;
						for (let i = 0; i < len; i++) {
							result.push(null);
						}
					};
				case NULLS32_HEADER:
					return () => {
						const len = readU32() + 260;
						for (let i = 0; i < len; i++) {
							result.push(null);
						}
					};
				case BOOLEANS_HEADER:
					return () => {
						const innerHeader = readU8();
						if ((innerHeader & 0xf0) === 0) {
							readBits(innerHeader, 3);
						} else if ((innerHeader & 0xe0) === 0) {
							readBits(innerHeader, 4);
						} else if ((innerHeader & 0xc0) === 0) {
							readBits(innerHeader, 5);
						} else if ((innerHeader & 0x80) === 0) {
							readBits(innerHeader, 6);
						} else if (innerHeader !== 0xff) {
							let count = (innerHeader & 0x7f) + 7;
							while (count > 8) {
								readBits(readU8(), 8);
								count -= 8;
							}
							readBits(readU8(), count);
						} else {
							let count = readU32();
							while (count > 8) {
								readBits(readU8(), 8);
								count -= 8;
							}
							readBits(readU8(), count);
						}
					};
				case STRING_HEADER:
					return () => {
						const len = readU32();
						if (isInCurrentBuffer(len) && currentPosition + len < 0x7fffffff) {
							result.push(
								currentBuffer.toString(
									undefined,
									currentPosition,
									currentPosition + len
								)
							);
							currentPosition += len;
							checkOverflow();
						} else {
							result.push(read(len).toString());
						}
					};
				case SHORT_STRING_HEADER:
					return () => result.push("");
				case SHORT_STRING_HEADER | 1:
					return () => {
						if (currentIsBuffer && currentPosition < 0x7ffffffe) {
							result.push(
								currentBuffer.toString(
									"latin1",
									currentPosition,
									currentPosition + 1
								)
							);
							currentPosition++;
							checkOverflow();
						} else {
							result.push(read(1).toString("latin1"));
						}
					};
				case I8_HEADER:
					return () => {
						if (currentIsBuffer) {
							result.push(
								/** @type {Buffer} */ (currentBuffer).readInt8(currentPosition)
							);
							currentPosition++;
							checkOverflow();
						} else {
							result.push(read(1).readInt8(0));
						}
					};
				default:
					if (header <= 10) {
						return () => result.push(header);
					} else if ((header & SHORT_STRING_HEADER) === SHORT_STRING_HEADER) {
						const len = header & SHORT_STRING_LENGTH_MASK;
						return () => {
							if (
								isInCurrentBuffer(len) &&
								currentPosition + len < 0x7fffffff
							) {
								result.push(
									currentBuffer.toString(
										"latin1",
										currentPosition,
										currentPosition + len
									)
								);
								currentPosition += len;
								checkOverflow();
							} else {
								result.push(read(len).toString("latin1"));
							}
						};
					} else if ((header & NUMBERS_HEADER_MASK) === F64_HEADER) {
						const len = (header & NUMBERS_COUNT_MASK) + 1;
						return () => {
							const need = F64_SIZE * len;
							if (isInCurrentBuffer(need)) {
								for (let i = 0; i < len; i++) {
									result.push(
										/** @type {Buffer} */ (currentBuffer).readDoubleLE(
											currentPosition
										)
									);
									currentPosition += F64_SIZE;
								}
								checkOverflow();
							} else {
								const buf = read(need);
								for (let i = 0; i < len; i++) {
									result.push(buf.readDoubleLE(i * F64_SIZE));
								}
							}
						};
					} else if ((header & NUMBERS_HEADER_MASK) === I32_HEADER) {
						const len = (header & NUMBERS_COUNT_MASK) + 1;
						return () => {
							const need = I32_SIZE * len;
							if (isInCurrentBuffer(need)) {
								for (let i = 0; i < len; i++) {
									result.push(
										/** @type {Buffer} */ (currentBuffer).readInt32LE(
											currentPosition
										)
									);
									currentPosition += I32_SIZE;
								}
								checkOverflow();
							} else {
								const buf = read(need);
								for (let i = 0; i < len; i++) {
									result.push(buf.readInt32LE(i * I32_SIZE));
								}
							}
						};
					} else if ((header & NUMBERS_HEADER_MASK) === I8_HEADER) {
						const len = (header & NUMBERS_COUNT_MASK) + 1;
						return () => {
							const need = I8_SIZE * len;
							if (isInCurrentBuffer(need)) {
								for (let i = 0; i < len; i++) {
									result.push(
										/** @type {Buffer} */ (currentBuffer).readInt8(
											currentPosition
										)
									);
									currentPosition += I8_SIZE;
								}
								checkOverflow();
							} else {
								const buf = read(need);
								for (let i = 0; i < len; i++) {
									result.push(buf.readInt8(i * I8_SIZE));
								}
							}
						};
					} else {
						return () => {
							throw new Error(
								`Unexpected header byte 0x${header.toString(16)}`
							);
						};
					}
			}
		});

		/** @type {DeserializedType} */
		let result = [];
		while (currentBuffer !== null) {
			if (typeof currentBuffer === "function") {
				result.push(this._deserializeLazy(currentBuffer, context));
				currentDataItem++;
				currentBuffer =
					currentDataItem < data.length ? data[currentDataItem] : null;
				currentIsBuffer = Buffer.isBuffer(currentBuffer);
			} else {
				const header = readU8();
				dispatchTable[header]();
			}
		}

		// avoid leaking memory in context
		let _result = result;
		result = undefined;
		return _result;
	}
}

module.exports = BinaryMiddleware;

module.exports.MEASURE_START_OPERATION = MEASURE_START_OPERATION;
module.exports.MEASURE_END_OPERATION = MEASURE_END_OPERATION;
