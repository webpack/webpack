/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");
const { createLazy } = require("./Lazy");
const Reader = require("./Reader");
const TypeRegistry = require("./TypeRegistry");
const {
	FORMAT_VERSION,
	MAGIC,
	SMALL_INT_MAX,
	T_ARRAY,
	T_BIGINT,
	T_BUF,
	T_DATE,
	T_F64,
	T_FALSE,
	T_INT,
	T_LAZY,
	T_MAP,
	T_NULL,
	T_NULL_PROTO,
	T_OBJECT,
	T_OBJ_REF,
	T_REGEXP,
	T_SEPARATE,
	T_SET,
	T_STR,
	T_STR_EMPTY,
	T_STR_INLINE,
	T_STR_REF,
	T_TRUE,
	T_TYPE_NEW,
	T_TYPE_REF,
	T_UNDEFINED
} = require("./format");

/** @typedef {{ context?: Record<string, EXPECTED_ANY>, fileStore?: import("./FileStore"), lazyTarget?: EXPECTED_ANY }} DecoderOptions */
/** @typedef {{ decode: (decoder: Decoder) => EXPECTED_ANY }} Codec */

class Decoder {
	/**
	 * @param {Buffer} buffer buffer
	 * @param {DecoderOptions=} options options
	 */
	constructor(buffer, { context = {}, fileStore, lazyTarget } = {}) {
		this.reader = new Reader(buffer);
		/** @type {string[]} */
		this.stringRefs = [];
		/** @type {EXPECTED_ANY[]} */
		this.objectRefs = [];
		this.objectRefSet = new WeakSet();
		/** @type {Codec[]} */
		this.typeRefs = [];
		/** @type {Record<string, EXPECTED_ANY>} */
		this.context = context;
		/** @type {import("./FileStore") | undefined} */
		this.fileStore = fileStore;
		/** @type {EXPECTED_ANY} */
		this.lazyTarget = lazyTarget || this;
		this.dispatch = createDispatch();
		this.read = this.read.bind(this);
		this.setCircularReference = this.setCircularReference.bind(this);
		Object.assign(this, context);
	}

	/**
	 * @returns {EXPECTED_ANY} value
	 */
	deserialize() {
		if (this.reader.readU32() !== MAGIC) {
			throw new Error("Invalid serialization magic");
		}
		if (this.reader.readU8() !== FORMAT_VERSION) {
			throw new Error("Version mismatch, serializer changed");
		}
		this.reader.readU8();
		return this.read();
	}

	/**
	 * @returns {EXPECTED_ANY} value
	 */
	read() {
		const tag = this.reader.readU8();
		if (tag <= SMALL_INT_MAX) return tag;
		return this.dispatch[tag](this);
	}

	/**
	 * @param {EXPECTED_ANY} _field field
	 * @returns {EXPECTED_ANY} value
	 */
	readField(_field) {
		return this.read();
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	setCircularReference(value) {
		this._addObjectReference(value);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	_addObjectReference(value) {
		if (value && typeof value === "object" && !this.objectRefSet.has(value)) {
			this.objectRefSet.add(value);
			this.objectRefs.push(value);
		}
	}

	/**
	 * @returns {string} string
	 */
	_readRawString() {
		return this.reader.readString(this.reader.readVarUint());
	}

	/**
	 * @returns {EXPECTED_ANY} value
	 */
	_readTypedObject() {
		const request = this.read();
		const name = this.read();
		const codec = TypeRegistry.getDeserializerFor(request, name);
		this.typeRefs.push(codec);
		return this._decodeWithCodec(codec);
	}

	/**
	 * @returns {EXPECTED_ANY} value
	 */
	_readTypedObjectRef() {
		const codec = this.typeRefs[this.reader.readVarUint()];
		if (!codec) throw new Error("Invalid type reference");
		return this._decodeWithCodec(codec);
	}

	/**
	 * @param {Codec} codec codec
	 * @returns {EXPECTED_ANY} value
	 */
	_decodeWithCodec(codec) {
		try {
			const value = codec.decode(this);
			this._addObjectReference(value);
			return value;
		} catch (err) {
			const error = /** @type {Error} */ (err);
			error.message += "\n(during deserialization of registered type)";
			throw error;
		}
	}
}

/**
 * @returns {((decoder: Decoder) => EXPECTED_ANY)[]} dispatch table
 */
const createDispatch = () => {
	/** @type {((decoder: Decoder) => EXPECTED_ANY)[]} */
	const table = Array.from({ length: 256 });
	for (let i = 0; i < table.length; i++) {
		table[i] = () => {
			throw new Error(`Unexpected serialization tag ${i}`);
		};
	}
	table[T_NULL] = () => null;
	table[T_UNDEFINED] = () => undefined;
	table[T_TRUE] = () => true;
	table[T_FALSE] = () => false;
	table[T_INT] = (decoder) => decoder.reader.readVarInt();
	table[T_F64] = (decoder) => decoder.reader.readF64();
	table[T_BIGINT] = (decoder) => BigInt(decoder._readRawString());
	table[T_STR_EMPTY] = () => "";
	table[T_STR_INLINE] = (decoder) => decoder._readRawString();
	table[T_STR] = (decoder) => {
		const value = decoder._readRawString();
		decoder.stringRefs.push(value);
		return value;
	};
	table[T_STR_REF] = (decoder) => {
		const value = decoder.stringRefs[decoder.reader.readVarUint()];
		if (value === undefined) throw new Error("Invalid string reference");
		return value;
	};
	table[T_BUF] = (decoder) => {
		const value = decoder.reader.readBytesCopy(decoder.reader.readVarUint());
		decoder._addObjectReference(value);
		return value;
	};
	table[T_OBJ_REF] = (decoder) => {
		const value = decoder.objectRefs[decoder.reader.readVarUint()];
		if (value === undefined) throw new Error("Invalid object reference");
		return value;
	};
	table[T_ARRAY] = (decoder) => {
		const length = decoder.reader.readVarUint();
		const value = Array.from({ length });
		decoder._addObjectReference(value);
		for (let i = 0; i < length; i++) value[i] = decoder.read();
		return value;
	};
	table[T_OBJECT] = (decoder) => {
		const count = decoder.reader.readVarUint();
		const value = /** @type {Record<string, EXPECTED_ANY>} */ ({});
		decoder._addObjectReference(value);
		for (let i = 0; i < count; i++) value[decoder.read()] = decoder.read();
		return value;
	};
	table[T_NULL_PROTO] = (decoder) => {
		const count = decoder.reader.readVarUint();
		const value = /** @type {Record<string, EXPECTED_ANY>} */ (
			Object.create(null)
		);
		decoder._addObjectReference(value);
		for (let i = 0; i < count; i++) value[decoder.read()] = decoder.read();
		return value;
	};
	table[T_MAP] = (decoder) => {
		const count = decoder.reader.readVarUint();
		const value = new Map();
		decoder._addObjectReference(value);
		for (let i = 0; i < count; i++) value.set(decoder.read(), decoder.read());
		return value;
	};
	table[T_SET] = (decoder) => {
		const count = decoder.reader.readVarUint();
		const value = new Set();
		decoder._addObjectReference(value);
		for (let i = 0; i < count; i++) value.add(decoder.read());
		return value;
	};
	table[T_DATE] = (decoder) => {
		const value = new Date(decoder.reader.readF64());
		decoder._addObjectReference(value);
		return value;
	};
	table[T_REGEXP] = (decoder) => {
		const value = new RegExp(decoder.read(), decoder.read());
		decoder._addObjectReference(value);
		return value;
	};
	table[T_TYPE_NEW] = (decoder) => decoder._readTypedObject();
	table[T_TYPE_REF] = (decoder) => decoder._readTypedObjectRef();
	table[T_LAZY] = (decoder) => {
		const buffer = decoder.reader.readBytesCopy(decoder.reader.readVarUint());
		return createLazy(
			memoize(() =>
				new Decoder(buffer, {
					context: decoder.context,
					fileStore: decoder.fileStore,
					lazyTarget: decoder.lazyTarget
				}).deserialize()
			),
			decoder.lazyTarget,
			{},
			buffer
		);
	};
	table[T_SEPARATE] = (decoder) => {
		const size = decoder.reader.readVarUint();
		const name = decoder._readRawString();
		if (!decoder.fileStore) {
			throw new Error("Separate value requires a file serializer");
		}
		return decoder.fileStore.readSeparateLazy(name, size, decoder.context);
	};
	return table;
};

module.exports = Decoder;
