/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");
const SerializerMiddleware = require("./SerializerMiddleware");

/** @typedef {import("./types").BufferSerializableType} BufferSerializableType */
/** @typedef {import("./types").PrimitiveSerializableType} PrimitiveSerializableType */

/*
Format:

File -> Section*

Section -> NullsSection |
					 BooleansSection |
					 F64NumbersSection |
					 I32NumbersSection |
					 I8NumbersSection |
					 ShortStringSection |
					 BigIntSection |
					 I32BigIntSection |
					 I8BigIntSection
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
BigIntSection -> BigIntSectionHeaderByte i32:length ascii-byte*
I32BigIntSection -> I32BigIntSectionHeaderByte i32
I8BigIntSection -> I8BigIntSectionHeaderByte i8

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
BigIntSectionHeaderByte -> 0b0001_1010
I32BigIntSectionHeaderByte -> 0b0001_1100
I8BigIntSectionHeaderByte -> 0b0001_1011
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
const NULL_AND_I16_HEADER = 0x19;
const NULL_AND_I32_HEADER = 0x16;
const NULL_AND_TRUE_HEADER = 0x17;
const NULL_AND_FALSE_HEADER = 0x18;
const BIGINT_HEADER = 0x1a;
const BIGINT_I8_HEADER = 0x1b;
const BIGINT_I32_HEADER = 0x1c;
const STRING_HEADER = 0x1e;
const BUFFER_HEADER = 0x1f;
const I8_HEADER = 0x60;
const I32_HEADER = 0x40;
const F64_HEADER = 0x20;
const SHORT_STRING_HEADER = 0x80;

/** Uplift high-order bits */
const NUMBERS_HEADER_MASK = 0xe0; // 0b1010_0000
const NUMBERS_COUNT_MASK = 0x1f; // 0b0001_1111
const SHORT_STRING_LENGTH_MASK = 0x7f; // 0b0111_1111

const HEADER_SIZE = 1;
const I8_SIZE = 1;
const I16_SIZE = 2;
const I32_SIZE = 4;
const F64_SIZE = 8;

const MEASURE_START_OPERATION = Symbol("MEASURE_START_OPERATION");
const MEASURE_END_OPERATION = Symbol("MEASURE_END_OPERATION");

/** @typedef {typeof MEASURE_START_OPERATION} MEASURE_START_OPERATION_TYPE */
/** @typedef {typeof MEASURE_END_OPERATION} MEASURE_END_OPERATION_TYPE */

/**
 * Returns type of number for serialization.
 * @param {number} n number
 * @returns {0 | 1 | 2} type of number for serialization
 */
const identifyNumber = (n) => {
	if (n === (n | 0)) {
		if (n <= 127 && n >= -128) return 0;
		if (n <= 2147483647 && n >= -2147483648) return 1;
	}
	return 2;
};

/**
 * Returns type of bigint for serialization.
 * @param {bigint} n bigint
 * @returns {0 | 1 | 2} type of bigint for serialization
 */
const identifyBigInt = (n) => {
	if (n <= BigInt(127) && n >= BigInt(-128)) return 0;
	if (n <= BigInt(2147483647) && n >= BigInt(-2147483648)) return 1;
	return 2;
};

/** @typedef {PrimitiveSerializableType[]} DeserializedType */
/** @typedef {BufferSerializableType[]} SerializedType} */
/** @typedef {{ retainedBuffer?: (x: Buffer) => Buffer }} Context} */

/**
 * Defines the lazy function type used by this module.
 * @template LazyInputValue
 * @template LazyOutputValue
 * @typedef {import("./SerializerMiddleware").LazyFunction<LazyInputValue, LazyOutputValue, BinaryMiddleware, undefined>} LazyFunction
 */

/**
 * Mutable read state of one `_deserialize` run; the module-level dispatch
 * table operates on this instead of per-call closures.
 */
class ReadState {
	/**
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @param {BinaryMiddleware} middleware binary middleware
	 */
	constructor(data, context, middleware) {
		/** @type {SerializedType} */
		this.data = data;
		/** @type {Context} */
		this.context = context;
		/** @type {BinaryMiddleware} */
		this.middleware = middleware;
		this.retainedBuffer = context.retainedBuffer || ((x) => x);
		/** @type {number} */
		this.currentDataItem = 0;
		/** @type {BufferSerializableType | null} */
		this.currentBuffer = data[0];
		/** @type {boolean} */
		this.currentIsBuffer = Buffer.isBuffer(this.currentBuffer);
		/** @type {number} */
		this.currentPosition = 0;
		/** @type {DeserializedType} */
		this.result = [];
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
		this.currentPosition += I8_SIZE;
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

	/**
	 * Pushes the lowest n bits of data as booleans.
	 * @param {number} data data
	 * @param {number} n n
	 */
	readBits(data, n) {
		let mask = 1;
		while (n !== 0) {
			this.result.push((data & mask) !== 0);
			mask <<= 1;
			n--;
		}
	}
}

/**
 * Deserialize handlers indexed by header byte; built once so each
 * `_deserialize` call doesn't rebuild 256 closures (hot on cache restore).
 * @type {((s: ReadState) => void)[]}
 */
const dispatchTable = Array.from({ length: 256 }, (_, header) => {
	switch (header) {
		case LAZY_HEADER:
			return (s) => {
				const count = s.readU32();
				/** @type {number[]} */
				const lengths = [];
				for (let i = 0; i < count; i++) lengths.push(s.readU32());
				/** @type {(Buffer | LazyFunction<SerializedType, DeserializedType>)[]} */
				const content = [];
				for (let l of lengths) {
					if (l === 0) {
						if (typeof s.currentBuffer !== "function") {
							throw new Error("Unexpected non-lazy element in stream");
						}
						content.push(s.currentBuffer);
						s.nextDataItem();
					} else {
						do {
							const buf = s.readUpTo(l);
							l -= buf.length;
							content.push(s.retainedBuffer(buf));
						} while (l > 0);
					}
				}
				s.result.push(s.middleware._createLazyDeserialized(content, s.context));
			};
		case BUFFER_HEADER:
			return (s) => {
				const len = s.readU32();
				s.result.push(s.retainedBuffer(s.read(len)));
			};
		case TRUE_HEADER:
			return (s) => s.result.push(true);
		case FALSE_HEADER:
			return (s) => s.result.push(false);
		case NULL3_HEADER:
			return (s) => s.result.push(null, null, null);
		case NULL2_HEADER:
			return (s) => s.result.push(null, null);
		case NULL_HEADER:
			return (s) => s.result.push(null);
		case NULL_AND_TRUE_HEADER:
			return (s) => s.result.push(null, true);
		case NULL_AND_FALSE_HEADER:
			return (s) => s.result.push(null, false);
		case NULL_AND_I8_HEADER:
			return (s) => {
				if (s.currentIsBuffer) {
					s.result.push(
						null,
						/** @type {Buffer} */ (s.currentBuffer).readInt8(s.currentPosition)
					);
					s.currentPosition += I8_SIZE;
					s.checkOverflow();
				} else {
					s.result.push(null, s.read(I8_SIZE).readInt8(0));
				}
			};
		case NULL_AND_I16_HEADER:
			return (s) => {
				s.result.push(null);
				if (s.isInCurrentBuffer(I16_SIZE)) {
					s.result.push(
						/** @type {Buffer} */ (s.currentBuffer).readInt16LE(
							s.currentPosition
						)
					);
					s.currentPosition += I16_SIZE;
					s.checkOverflow();
				} else {
					s.result.push(s.read(I16_SIZE).readInt16LE(0));
				}
			};
		case NULL_AND_I32_HEADER:
			return (s) => {
				s.result.push(null);
				if (s.isInCurrentBuffer(I32_SIZE)) {
					s.result.push(
						/** @type {Buffer} */ (s.currentBuffer).readInt32LE(
							s.currentPosition
						)
					);
					s.currentPosition += I32_SIZE;
					s.checkOverflow();
				} else {
					s.result.push(s.read(I32_SIZE).readInt32LE(0));
				}
			};
		case NULLS8_HEADER:
			return (s) => {
				const len = s.readU8() + 4;
				for (let i = 0; i < len; i++) {
					s.result.push(null);
				}
			};
		case NULLS32_HEADER:
			return (s) => {
				const len = s.readU32() + 260;
				for (let i = 0; i < len; i++) {
					s.result.push(null);
				}
			};
		case BOOLEANS_HEADER:
			return (s) => {
				const innerHeader = s.readU8();
				if ((innerHeader & 0xf0) === 0) {
					s.readBits(innerHeader, 3);
				} else if ((innerHeader & 0xe0) === 0) {
					s.readBits(innerHeader, 4);
				} else if ((innerHeader & 0xc0) === 0) {
					s.readBits(innerHeader, 5);
				} else if ((innerHeader & 0x80) === 0) {
					s.readBits(innerHeader, 6);
				} else if (innerHeader !== 0xff) {
					let count = (innerHeader & 0x7f) + 7;
					while (count > 8) {
						s.readBits(s.readU8(), 8);
						count -= 8;
					}
					s.readBits(s.readU8(), count);
				} else {
					let count = s.readU32();
					while (count > 8) {
						s.readBits(s.readU8(), 8);
						count -= 8;
					}
					s.readBits(s.readU8(), count);
				}
			};
		case STRING_HEADER:
			return (s) => {
				const len = s.readU32();
				if (s.isInCurrentBuffer(len) && s.currentPosition + len < 0x7fffffff) {
					s.result.push(
						/** @type {Buffer} */
						(s.currentBuffer).toString(
							undefined,
							s.currentPosition,
							s.currentPosition + len
						)
					);
					s.currentPosition += len;
					s.checkOverflow();
				} else {
					s.result.push(s.read(len).toString());
				}
			};
		case SHORT_STRING_HEADER:
			return (s) => s.result.push("");
		case SHORT_STRING_HEADER | 1:
			return (s) => {
				if (s.currentIsBuffer && s.currentPosition < 0x7ffffffe) {
					s.result.push(
						/** @type {Buffer} */
						(s.currentBuffer).toString(
							"latin1",
							s.currentPosition,
							s.currentPosition + 1
						)
					);
					s.currentPosition++;
					s.checkOverflow();
				} else {
					s.result.push(s.read(1).toString("latin1"));
				}
			};
		case I8_HEADER:
			return (s) => {
				if (s.currentIsBuffer) {
					s.result.push(
						/** @type {Buffer} */ (s.currentBuffer).readInt8(s.currentPosition)
					);
					s.currentPosition++;
					s.checkOverflow();
				} else {
					s.result.push(s.read(1).readInt8(0));
				}
			};
		case BIGINT_I8_HEADER: {
			const len = 1;
			return (s) => {
				const need = I8_SIZE * len;

				if (s.isInCurrentBuffer(need)) {
					for (let i = 0; i < len; i++) {
						const value =
							/** @type {Buffer} */
							(s.currentBuffer).readInt8(s.currentPosition);
						s.result.push(BigInt(value));
						s.currentPosition += I8_SIZE;
					}
					s.checkOverflow();
				} else {
					const buf = s.read(need);
					for (let i = 0; i < len; i++) {
						const value = buf.readInt8(i * I8_SIZE);
						s.result.push(BigInt(value));
					}
				}
			};
		}
		case BIGINT_I32_HEADER: {
			const len = 1;
			return (s) => {
				const need = I32_SIZE * len;
				if (s.isInCurrentBuffer(need)) {
					for (let i = 0; i < len; i++) {
						const value = /** @type {Buffer} */ (s.currentBuffer).readInt32LE(
							s.currentPosition
						);
						s.result.push(BigInt(value));
						s.currentPosition += I32_SIZE;
					}
					s.checkOverflow();
				} else {
					const buf = s.read(need);
					for (let i = 0; i < len; i++) {
						const value = buf.readInt32LE(i * I32_SIZE);
						s.result.push(BigInt(value));
					}
				}
			};
		}
		case BIGINT_HEADER: {
			return (s) => {
				const len = s.readU32();
				if (s.isInCurrentBuffer(len) && s.currentPosition + len < 0x7fffffff) {
					const value =
						/** @type {Buffer} */
						(s.currentBuffer).toString(
							undefined,
							s.currentPosition,
							s.currentPosition + len
						);

					s.result.push(BigInt(value));
					s.currentPosition += len;
					s.checkOverflow();
				} else {
					const value = s.read(len).toString();
					s.result.push(BigInt(value));
				}
			};
		}
		default:
			if (header <= 10) {
				return (s) => s.result.push(header);
			} else if ((header & SHORT_STRING_HEADER) === SHORT_STRING_HEADER) {
				const len = header & SHORT_STRING_LENGTH_MASK;
				return (s) => {
					if (
						s.isInCurrentBuffer(len) &&
						s.currentPosition + len < 0x7fffffff
					) {
						s.result.push(
							/** @type {Buffer} */
							(s.currentBuffer).toString(
								"latin1",
								s.currentPosition,
								s.currentPosition + len
							)
						);
						s.currentPosition += len;
						s.checkOverflow();
					} else {
						s.result.push(s.read(len).toString("latin1"));
					}
				};
			} else if ((header & NUMBERS_HEADER_MASK) === F64_HEADER) {
				const len = (header & NUMBERS_COUNT_MASK) + 1;
				return (s) => {
					const need = F64_SIZE * len;
					if (s.isInCurrentBuffer(need)) {
						for (let i = 0; i < len; i++) {
							s.result.push(
								/** @type {Buffer} */ (s.currentBuffer).readDoubleLE(
									s.currentPosition
								)
							);
							s.currentPosition += F64_SIZE;
						}
						s.checkOverflow();
					} else {
						const buf = s.read(need);
						for (let i = 0; i < len; i++) {
							s.result.push(buf.readDoubleLE(i * F64_SIZE));
						}
					}
				};
			} else if ((header & NUMBERS_HEADER_MASK) === I32_HEADER) {
				const len = (header & NUMBERS_COUNT_MASK) + 1;
				return (s) => {
					const need = I32_SIZE * len;
					if (s.isInCurrentBuffer(need)) {
						for (let i = 0; i < len; i++) {
							s.result.push(
								/** @type {Buffer} */ (s.currentBuffer).readInt32LE(
									s.currentPosition
								)
							);
							s.currentPosition += I32_SIZE;
						}
						s.checkOverflow();
					} else {
						const buf = s.read(need);
						for (let i = 0; i < len; i++) {
							s.result.push(buf.readInt32LE(i * I32_SIZE));
						}
					}
				};
			} else if ((header & NUMBERS_HEADER_MASK) === I8_HEADER) {
				const len = (header & NUMBERS_COUNT_MASK) + 1;
				return (s) => {
					const need = I8_SIZE * len;
					if (s.isInCurrentBuffer(need)) {
						for (let i = 0; i < len; i++) {
							s.result.push(
								/** @type {Buffer} */ (s.currentBuffer).readInt8(
									s.currentPosition
								)
							);
							s.currentPosition += I8_SIZE;
						}
						s.checkOverflow();
					} else {
						const buf = s.read(need);
						for (let i = 0; i < len; i++) {
							s.result.push(buf.readInt8(i * I8_SIZE));
						}
					}
				};
			}
			return (s) => {
				throw new Error(`Unexpected header byte 0x${header.toString(16)}`);
			};
	}
});

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
	 * @param {{ leftOverBuffer: Buffer | null, allocationSize: number, increaseCounter: number }} allocationScope allocation scope
	 * @returns {SerializedType} serialized data
	 */
	_serialize(
		data,
		context,
		allocationScope = {
			allocationSize: 1024,
			increaseCounter: 0,
			leftOverBuffer: null
		}
	) {
		/** @type {Buffer | null} */
		let leftOverBuffer = null;
		/** @type {BufferSerializableType[]} */
		let buffers = [];
		/** @type {Buffer | null} */
		let currentBuffer = allocationScope ? allocationScope.leftOverBuffer : null;
		allocationScope.leftOverBuffer = null;
		let currentPosition = 0;
		if (currentBuffer === null) {
			currentBuffer = Buffer.allocUnsafe(allocationScope.allocationSize);
		}
		/**
		 * Processes the provided bytes needed.
		 * @param {number} bytesNeeded bytes needed
		 */
		const allocate = (bytesNeeded) => {
			if (currentBuffer !== null) {
				if (currentBuffer.length - currentPosition >= bytesNeeded) return;
				flush();
			}
			if (leftOverBuffer && leftOverBuffer.length >= bytesNeeded) {
				currentBuffer = leftOverBuffer;
				leftOverBuffer = null;
			} else {
				currentBuffer = Buffer.allocUnsafe(
					Math.max(bytesNeeded, allocationScope.allocationSize)
				);
				if (
					!(allocationScope.increaseCounter =
						(allocationScope.increaseCounter + 1) % 4) &&
					allocationScope.allocationSize < 16777216
				) {
					allocationScope.allocationSize <<= 1;
				}
			}
		};
		const flush = () => {
			if (currentBuffer !== null) {
				if (currentPosition > 0) {
					buffers.push(
						Buffer.from(
							currentBuffer.buffer,
							currentBuffer.byteOffset,
							currentPosition
						)
					);
				}
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
				currentPosition = 0;
			}
		};
		/**
		 * Processes the provided byte.
		 * @param {number} byte byte
		 */
		const writeU8 = (byte) => {
			/** @type {Buffer} */
			(currentBuffer).writeUInt8(byte, currentPosition++);
		};
		/**
		 * Processes the provided ui32.
		 * @param {number} ui32 ui32
		 */
		const writeU32 = (ui32) => {
			/** @type {Buffer} */
			(currentBuffer).writeUInt32LE(ui32, currentPosition);
			currentPosition += 4;
		};
		/** @type {number[]} */
		const measureStack = [];
		const measureStart = () => {
			measureStack.push(buffers.length, currentPosition);
		};
		/**
		 * Returns size.
		 * @returns {number} size
		 */
		const measureEnd = () => {
			const oldPos = /** @type {number} */ (measureStack.pop());
			const buffersIndex = /** @type {number} */ (measureStack.pop());
			let size = currentPosition - oldPos;
			for (let i = buffersIndex; i < buffers.length; i++) {
				size += buffers[i].length;
			}
			return size;
		};
		for (let i = 0; i < data.length; i++) {
			const thing = data[i];
			switch (typeof thing) {
				case "function": {
					if (!SerializerMiddleware.isLazy(thing)) {
						throw new Error(`Unexpected function ${thing}`);
					}
					/** @type {SerializedType | LazyFunction<SerializedType, DeserializedType> | undefined} */
					let serializedData =
						SerializerMiddleware.getLazySerializedValue(thing);
					if (serializedData === undefined) {
						if (SerializerMiddleware.isLazy(thing, this)) {
							flush();
							allocationScope.leftOverBuffer = leftOverBuffer;
							const result =
								/** @type {PrimitiveSerializableType[]} */
								(thing());
							const data = this._serialize(result, context, allocationScope);
							leftOverBuffer = allocationScope.leftOverBuffer;
							allocationScope.leftOverBuffer = null;
							SerializerMiddleware.setLazySerializedValue(thing, data);
							serializedData = data;
						} else {
							serializedData = this._serializeLazy(thing, context);
							flush();
							buffers.push(serializedData);
							break;
						}
					} else if (typeof serializedData === "function") {
						flush();
						buffers.push(serializedData);
						break;
					}
					/** @type {number[]} */
					const lengths = [];
					for (const item of serializedData) {
						/** @type {undefined | number} */
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
					break;
				}
				case "string": {
					const len = Buffer.byteLength(thing);
					if (len >= 128 || len !== thing.length) {
						allocate(len + HEADER_SIZE + I32_SIZE);
						writeU8(STRING_HEADER);
						writeU32(len);
						currentBuffer.write(thing, currentPosition);
						currentPosition += len;
					} else if (len >= 70) {
						allocate(len + HEADER_SIZE);
						writeU8(SHORT_STRING_HEADER | len);

						currentBuffer.write(thing, currentPosition, "latin1");
						currentPosition += len;
					} else {
						allocate(len + HEADER_SIZE);
						writeU8(SHORT_STRING_HEADER | len);

						for (let i = 0; i < len; i++) {
							currentBuffer[currentPosition++] = thing.charCodeAt(i);
						}
					}
					break;
				}
				case "bigint": {
					const type = identifyBigInt(thing);
					if (type === 0 && thing >= 0 && thing <= BigInt(10)) {
						// shortcut for very small bigints
						allocate(HEADER_SIZE + I8_SIZE);
						writeU8(BIGINT_I8_HEADER);
						writeU8(Number(thing));
						break;
					}

					switch (type) {
						case 0: {
							let n = 1;
							allocate(HEADER_SIZE + I8_SIZE * n);
							writeU8(BIGINT_I8_HEADER | (n - 1));
							while (n > 0) {
								currentBuffer.writeInt8(
									Number(/** @type {bigint} */ (data[i])),
									currentPosition
								);
								currentPosition += I8_SIZE;
								n--;
								i++;
							}
							i--;
							break;
						}
						case 1: {
							let n = 1;
							allocate(HEADER_SIZE + I32_SIZE * n);
							writeU8(BIGINT_I32_HEADER | (n - 1));
							while (n > 0) {
								currentBuffer.writeInt32LE(
									Number(/** @type {bigint} */ (data[i])),
									currentPosition
								);
								currentPosition += I32_SIZE;
								n--;
								i++;
							}
							i--;
							break;
						}
						default: {
							const value = thing.toString();
							const len = Buffer.byteLength(value);
							allocate(len + HEADER_SIZE + I32_SIZE);
							writeU8(BIGINT_HEADER);
							writeU32(len);
							currentBuffer.write(value, currentPosition);
							currentPosition += len;
							break;
						}
					}
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
					/** @type {number[]} */
					const bytes = [];
					let count = 1;
					/** @type {undefined | number} */
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
						allocate(HEADER_SIZE + I8_SIZE + I8_SIZE * bytes.length + I8_SIZE);
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
						/** @type {number} */
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
										// `null` + i32 is 5 bytes; if the value also fits an
										// i16, fuse it as 3 bytes instead (helps back-references)
										if (next >= -32768 && next <= 32767) {
											allocate(HEADER_SIZE + I16_SIZE);
											writeU8(NULL_AND_I16_HEADER);
											currentBuffer.writeInt16LE(next, currentPosition);
											currentPosition += I16_SIZE;
										} else {
											allocate(HEADER_SIZE + I32_SIZE);
											writeU8(NULL_AND_I32_HEADER);
											currentBuffer.writeInt32LE(next, currentPosition);
											currentPosition += I32_SIZE;
										}
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
				default: {
					throw new Error(
						`Unknown typeof "${typeof thing}" in binary middleware`
					);
				}
			}
		}
		flush();

		allocationScope.leftOverBuffer = leftOverBuffer;

		// avoid leaking memory
		currentBuffer = null;
		leftOverBuffer = null;
		allocationScope = /** @type {EXPECTED_ANY} */ (undefined);
		const _buffers = buffers;
		buffers = /** @type {EXPECTED_ANY} */ (undefined);
		return _buffers;
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
	 * Create lazy deserialized. Internal, but called from the dispatch table.
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
		const state = new ReadState(data, context, this);
		while (state.currentBuffer !== null) {
			if (typeof state.currentBuffer === "function") {
				state.result.push(this._deserializeLazy(state.currentBuffer, context));
				state.nextDataItem();
			} else {
				dispatchTable[state.readU8()](state);
			}
		}
		return state.result;
	}
}

module.exports = BinaryMiddleware;

module.exports.MEASURE_END_OPERATION = MEASURE_END_OPERATION;
module.exports.MEASURE_START_OPERATION = MEASURE_START_OPERATION;
