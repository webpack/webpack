/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const SerializerMiddleware = require("./SerializerMiddleware");

/*
Format:

File -> Section*

Section -> NullsSection |
					 F64NumbersSection |
					 I32NumbersSection |
					 I8NumbersSection |
					 ShortStringSection |
					 StringSection |
					 BufferSection |
					 BooleanSection |
					 NopSection



NullsSection -> NullsSectionHeaderByte
F64NumbersSection -> F64NumbersSectionHeaderByte f64*
I32NumbersSection -> I32NumbersSectionHeaderByte i32*
I8NumbersSection -> I8NumbersSectionHeaderByte i8*
ShortStringSection -> ShortStringSectionHeaderByte utf8-byte*
StringSection -> StringSectionHeaderByte i32:length utf8-byte*
BufferSection -> BufferSectionHeaderByte i32:length byte*
BooleanSection -> TrueHeaderByte | FalseHeaderByte
NopSection --> NopSectionHeaderByte

ShortStringSectionHeaderByte -> 0b1nnn_nnnn (n:length)

F64NumbersSectionHeaderByte -> 0b001n_nnnn (n:length)
I32NumbersSectionHeaderByte -> 0b010n_nnnn (n:length)
I8NumbersSectionHeaderByte -> 0b011n_nnnn (n:length)

NullsSectionHeaderByte -> 0b0001_nnnn (n:length)

StringSectionHeaderByte -> 0b0000_1110
BufferSectionHeaderByte -> 0b0000_1111
NopSectionHeaderByte -> 0b0000_1011
FalseHeaderByte -> 0b0000_1100
TrueHeaderByte -> 0b0000_1101

RawNumber -> n (n <= 10)

*/

const NOP_HEADER = 0x0b;
const TRUE_HEADER = 0x0c;
const FALSE_HEADER = 0x0d;
const STRING_HEADER = 0x0e;
const BUFFER_HEADER = 0x0f;
const NULLS_HEADER_MASK = 0xf0;
const NULLS_HEADER = 0x10;
const NUMBERS_HEADER_MASK = 0xe0;
const I8_HEADER = 0x60;
const I32_HEADER = 0x40;
const F64_HEADER = 0x20;
const SHORT_STRING_HEADER = 0x80;

const identifyNumber = n => {
	if (n === (n | 0)) {
		if (n <= 127 && n >= -128) return 0;
		if (n <= 2147483647 && n >= -2147483648) return 1;
	}
	return 2;
};

class BinaryMiddleware extends SerializerMiddleware {
	_handleFunctionSerialization(fn, context) {
		return () => {
			const r = fn();
			if (r instanceof Promise)
				return r.then(data => this.serialize(data, context));
			return this.serialize(r, context);
		};
	}

	_handleFunctionDeserialization(fn, context) {
		return () => {
			const r = fn();
			if (r instanceof Promise)
				return r.then(data => this.deserialize(data, context));
			return this.deserialize(r, context);
		};
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} serialized data
	 */
	serialize(data, context) {
		/** @type {Buffer} */
		let currentBuffer = null;
		let currentPosition = 0;
		const buffers = [];
		const allocate = (bytesNeeded, exact = false) => {
			if (currentBuffer !== null) {
				if (currentBuffer.length - currentPosition >= bytesNeeded) return;
				flush();
			}
			currentBuffer = Buffer.alloc(
				exact ? bytesNeeded : Math.max(bytesNeeded, 1024)
			);
		};
		const flush = () => {
			if (currentBuffer !== null) {
				buffers.push(currentBuffer.slice(0, currentPosition));
				currentBuffer = null;
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
		for (let i = 0; i < data.length; i++) {
			const thing = data[i];
			switch (typeof thing) {
				case "function": {
					flush();
					buffers.push(this._handleFunctionSerialization(thing, context));
					break;
				}
				case "string": {
					const len = Buffer.byteLength(thing);
					if (len > 128) {
						allocate(len + 5);
						writeU8(STRING_HEADER);
						writeU32(len);
					} else {
						allocate(len + 1);
						writeU8(SHORT_STRING_HEADER | len);
					}
					currentBuffer.write(thing, currentPosition);
					currentPosition += len;
					break;
				}
				case "number": {
					const type = identifyNumber(thing);
					if (type === 0 && thing >= 0 && thing <= 10) {
						// shortcut for very small numbers
						allocate(1);
						writeU8(thing);
						break;
					}
					let n;
					for (n = 1; n < 32 && i + n < data.length; n++) {
						const item = data[i + n];
						if (typeof item !== "number") break;
						if (identifyNumber(item) !== type) break;
					}
					switch (type) {
						case 0:
							allocate(1 + n);
							writeU8(I8_HEADER | (n - 1));
							while (n > 0) {
								currentBuffer.writeInt8(data[i], currentPosition);
								currentPosition++;
								n--;
								i++;
							}
							break;
						case 1:
							allocate(1 + 4 * n);
							writeU8(I32_HEADER | (n - 1));
							while (n > 0) {
								currentBuffer.writeInt32LE(data[i], currentPosition);
								currentPosition += 4;
								n--;
								i++;
							}
							break;
						case 2:
							allocate(1 + 8 * n);
							writeU8(F64_HEADER | (n - 1));
							while (n > 0) {
								currentBuffer.writeDoubleLE(data[i], currentPosition);
								currentPosition += 8;
								n--;
								i++;
							}
							break;
					}
					i--;
					break;
				}
				case "boolean":
					allocate(1);
					writeU8(thing === true ? TRUE_HEADER : FALSE_HEADER);
					break;
				case "object": {
					if (thing === null) {
						let n;
						for (n = 1; n < 16 && i + n < data.length; n++) {
							const item = data[i + n];
							if (item !== null) break;
						}
						allocate(1);
						writeU8(NULLS_HEADER | (n - 1));
						i += n - 1;
					} else if (Buffer.isBuffer(thing)) {
						allocate(5, true);
						writeU8(BUFFER_HEADER);
						writeU32(thing.length);
						flush();
						buffers.push(thing);
					}
					break;
				}
			}
		}
		flush();
		return buffers;
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} deserialized data
	 */
	deserialize(data, context) {
		let currentDataItem = 0;
		let currentBuffer = data[0];
		let currentPosition = 0;
		const checkOverflow = () => {
			if (currentPosition >= currentBuffer.length) {
				currentPosition = 0;
				currentDataItem++;
				currentBuffer =
					currentDataItem < data.length ? data[currentDataItem] : null;
			}
		};
		const read = n => {
			if (currentBuffer === null) throw new Error("Unexpected end of stream");
			if (!Buffer.isBuffer(currentBuffer))
				throw new Error("Unexpected lazy element in stream");
			const rem = currentBuffer.length - currentPosition;
			if (rem < n) {
				return Buffer.concat([read(rem), read(n - rem)]);
			}
			const res = currentBuffer.slice(currentPosition, currentPosition + n);
			currentPosition += n;
			checkOverflow();
			return res;
		};
		const readU8 = () => {
			if (currentBuffer === null) throw new Error("Unexpected end of stream");
			if (!Buffer.isBuffer(currentBuffer))
				throw new Error("Unexpected lazy element in stream");
			const byte = currentBuffer.readUInt8(currentPosition);
			currentPosition++;
			checkOverflow();
			return byte;
		};
		const readU32 = () => {
			return read(4).readUInt32LE(0);
		};
		const result = [];
		while (currentBuffer !== null) {
			if (typeof currentBuffer === "function") {
				result.push(
					this._handleFunctionDeserialization(currentBuffer, context)
				);
				currentDataItem++;
				currentBuffer =
					currentDataItem < data.length ? data[currentDataItem] : null;
				continue;
			}
			const header = readU8();
			switch (header) {
				case NOP_HEADER:
					break;
				case BUFFER_HEADER: {
					const len = readU32();
					result.push(read(len));
					break;
				}
				case TRUE_HEADER:
					result.push(true);
					break;
				case FALSE_HEADER:
					result.push(false);
					break;
				case STRING_HEADER: {
					const len = readU32();
					const buf = read(len);
					result.push(buf.toString());
					break;
				}
				default:
					if (header <= 10) {
						result.push(header);
					} else if ((header & SHORT_STRING_HEADER) === SHORT_STRING_HEADER) {
						const len = header & 0x7f;
						const buf = read(len);
						result.push(buf.toString());
					} else if ((header & NUMBERS_HEADER_MASK) === F64_HEADER) {
						const len = header & 0x1f;
						const buf = read(8 * len + 8);
						for (let i = 0; i <= len; i++) {
							result.push(buf.readDoubleLE(i * 8));
						}
					} else if ((header & NUMBERS_HEADER_MASK) === I32_HEADER) {
						const len = header & 0x1f;
						const buf = read(4 * len + 4);
						for (let i = 0; i <= len; i++) {
							result.push(buf.readInt32LE(i * 4));
						}
					} else if ((header & NUMBERS_HEADER_MASK) === I8_HEADER) {
						const len = header & 0x1f;
						const buf = read(len + 1);
						for (let i = 0; i <= len; i++) {
							result.push(buf.readInt8(i));
						}
					} else if ((header & NULLS_HEADER_MASK) === NULLS_HEADER) {
						const len = header & 0x0f;
						for (let i = 0; i <= len; i++) {
							result.push(null);
						}
					} else {
						throw new Error(`Unexpected header byte 0x${header.toString(16)}`);
					}
					break;
			}
		}
		return result;
	}
}

module.exports = BinaryMiddleware;
