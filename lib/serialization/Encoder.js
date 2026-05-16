/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	createLazy,
	getLazySerializedValue,
	isLazy,
	setLazySerializedValue
} = require("./Lazy");
const TypeRegistry = require("./TypeRegistry");
const Writer = require("./Writer");
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

/** @typedef {{ context?: Record<string, EXPECTED_ANY>, fileStore?: import("./FileStore"), lazyTarget?: EXPECTED_ANY }} EncoderOptions */
/** @typedef {{ position: number, stringRefs: Map<string, number>, objectRefs: Map<EXPECTED_ANY, number>, typeRefs: Map<string, number>, cycleStack: Set<EXPECTED_ANY> }} EncoderSnapshot */
/** @typedef {string | { type?: "lazy" | "separate" | string, name?: string }} FieldOptions */

class Encoder {
	/**
	 * @param {EncoderOptions=} options options
	 */
	constructor({ context = {}, fileStore, lazyTarget } = {}) {
		this.writer = new Writer();
		/** @type {Map<string, number>} */
		this.stringRefs = new Map();
		/** @type {Map<EXPECTED_ANY, number>} */
		this.objectRefs = new Map();
		/** @type {Map<string, number>} */
		this.typeRefs = new Map();
		/** @type {Set<EXPECTED_ANY>} */
		this.cycleStack = new Set();
		/** @type {Record<string, EXPECTED_ANY>} */
		this.context = context;
		/** @type {import("./FileStore") | undefined} */
		this.fileStore = fileStore;
		/** @type {EXPECTED_ANY} */
		this.lazyTarget = lazyTarget || this;
		this.write = this.write.bind(this);
		this.writeLazy = this.writeLazy.bind(this);
		this.writeSeparate = this.writeSeparate.bind(this);
		this.setCircularReference = this.setCircularReference.bind(this);
		this.snapshot = this.snapshot.bind(this);
		this.rollback = this.rollback.bind(this);
		Object.assign(this, context);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {Buffer | null} serialized buffer
	 */
	serialize(value) {
		this.writer.writeU32(MAGIC);
		this.writer.writeU8(FORMAT_VERSION);
		this.writer.writeU8(0);
		try {
			this.write(value);
		} catch (err) {
			if (err === TypeRegistry.NOT_SERIALIZABLE) return null;
			throw err;
		}
		return this.writer.toBuffer();
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	write(value) {
		this._write(value);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @param {FieldOptions} field field options
	 * @returns {void}
	 */
	writeField(value, field) {
		const type = typeof field === "string" ? undefined : field.type;
		if (type === "lazy") {
			this.writeLazy(value);
		} else if (type === "separate") {
			this.writeSeparate(
				value,
				/** @type {{ name?: string, type?: string }} */ (field)
			);
		} else {
			this.write(value);
		}
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	setCircularReference(value) {
		if (value && (typeof value === "object" || typeof value === "function")) {
			this._addObjectReference(value);
		}
	}

	/**
	 * @returns {EncoderSnapshot} snapshot
	 */
	snapshot() {
		return {
			position: this.writer.length,
			stringRefs: new Map(this.stringRefs),
			objectRefs: new Map(this.objectRefs),
			typeRefs: new Map(this.typeRefs),
			cycleStack: new Set(this.cycleStack)
		};
	}

	/**
	 * @param {EncoderSnapshot} snapshot snapshot
	 * @returns {void}
	 */
	rollback(snapshot) {
		this.writer.truncate(snapshot.position);
		this.stringRefs = new Map(snapshot.stringRefs);
		this.objectRefs = new Map(snapshot.objectRefs);
		this.typeRefs = new Map(snapshot.typeRefs);
		this.cycleStack = new Set(snapshot.cycleStack);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	writeLazy(value) {
		const lazy = isLazy(value)
			? value
			: createLazy(value, this.lazyTarget, undefined);
		let buffer = getLazySerializedValue(lazy);
		if (!Buffer.isBuffer(buffer)) {
			const data = lazy();
			if (data && typeof data.then === "function") {
				throw new Error(
					"Async lazy serialization is not supported by this encoder"
				);
			}
			const child = new Encoder({
				context: this.context,
				fileStore: this.fileStore,
				lazyTarget: this.lazyTarget
			});
			buffer = child.serialize(data);
			setLazySerializedValue(lazy, buffer);
		}
		this.writer.writeU8(T_LAZY);
		this.writer.writeVarUint(buffer.length);
		this.writer.writeBytes(buffer);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @param {{ name?: string, type?: string }} options options
	 * @returns {() => EXPECTED_ANY} lazy
	 */
	writeSeparate(value, options) {
		if (!this.fileStore) {
			throw new Error("writeSeparate requires a file serializer");
		}
		const info = this.fileStore.writeSeparate(this, value, options);
		this.writer.writeU8(T_SEPARATE);
		this.writer.writeVarUint(info.size);
		this._writeRawString(info.name);
		return info.lazy;
	}

	/**
	 * @param {string} str string
	 * @returns {void}
	 */
	_writeRawString(str) {
		const byteLength = Buffer.byteLength(str);
		this.writer.writeVarUint(byteLength);
		this.writer.writeStringRaw(str, byteLength);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {boolean} true, when written
	 */
	_writeObjectReference(value) {
		const ref = this.objectRefs.get(value);
		if (ref === undefined) return false;
		this.writer.writeU8(T_OBJ_REF);
		this.writer.writeVarUint(ref);
		return true;
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	_addObjectReference(value) {
		if (!this.objectRefs.has(value)) {
			this.objectRefs.set(value, this.objectRefs.size);
		}
	}

	/**
	 * @param {number} value value
	 * @returns {void}
	 */
	_writeNumber(value) {
		if (Number.isSafeInteger(value) && !Object.is(value, -0)) {
			if (value >= 0 && value <= SMALL_INT_MAX) {
				this.writer.writeU8(value);
			} else {
				this.writer.writeU8(T_INT);
				this.writer.writeVarInt(value);
			}
		} else {
			this.writer.writeU8(T_F64);
			this.writer.writeF64(value);
		}
	}

	/**
	 * @param {string} value value
	 * @returns {void}
	 */
	_writeString(value) {
		if (value.length === 0) {
			this.writer.writeU8(T_STR_EMPTY);
			return;
		}
		if (value.length > 1) {
			const ref = this.stringRefs.get(value);
			if (ref !== undefined) {
				this.writer.writeU8(T_STR_REF);
				this.writer.writeVarUint(ref);
				return;
			}
			this.stringRefs.set(value, this.stringRefs.size);
			this.writer.writeU8(T_STR);
		} else {
			this.writer.writeU8(T_STR_INLINE);
		}
		this._writeRawString(value);
	}

	/**
	 * @param {Buffer} value value
	 * @returns {void}
	 */
	_writeBuffer(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_BUF);
		this.writer.writeVarUint(value.length);
		this.writer.writeBytes(value);
	}

	/**
	 * @param {EXPECTED_ANY[]} value value
	 * @returns {void}
	 */
	_writeArray(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_ARRAY);
		this.writer.writeVarUint(value.length);
		for (const item of value) this.write(item);
	}

	/**
	 * @param {Record<string, EXPECTED_ANY>} value value
	 * @param {boolean} nullProto true, when null prototype object
	 * @returns {void}
	 */
	_writePlainObject(value, nullProto) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		const keys = Object.keys(value);
		this.writer.writeU8(nullProto ? T_NULL_PROTO : T_OBJECT);
		this.writer.writeVarUint(keys.length);
		for (const key of keys) {
			this._writeString(key);
			this.write(value[key]);
		}
	}

	/**
	 * @param {Map<EXPECTED_ANY, EXPECTED_ANY>} value value
	 * @returns {void}
	 */
	_writeMap(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_MAP);
		this.writer.writeVarUint(value.size);
		for (const [key, item] of value) {
			this.write(key);
			this.write(item);
		}
	}

	/**
	 * @param {Set<EXPECTED_ANY>} value value
	 * @returns {void}
	 */
	_writeSet(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_SET);
		this.writer.writeVarUint(value.size);
		for (const item of value) this.write(item);
	}

	/**
	 * @param {Date} value value
	 * @returns {void}
	 */
	_writeDate(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_DATE);
		this.writer.writeF64(value.getTime());
	}

	/**
	 * @param {RegExp} value value
	 * @returns {void}
	 */
	_writeRegExp(value) {
		if (this._writeObjectReference(value)) return;
		this._addObjectReference(value);
		this.writer.writeU8(T_REGEXP);
		this._writeString(value.source);
		this._writeString(value.flags);
	}

	/**
	 * @param {EXPECTED_OBJECT} value value
	 * @returns {void}
	 */
	_writeTypedObject(value) {
		if (this._writeObjectReference(value)) return;
		if (this.cycleStack.has(value)) {
			throw new Error(
				"This is a circular reference. To serialize circular references use 'setCircularReference' somewhere in the cycle during serialize and deserialize."
			);
		}
		const { request, name, codec } = TypeRegistry.getSerializerFor(value);
		const key = `${request}/${name}`;
		const typeRef = this.typeRefs.get(key);
		if (typeRef === undefined) {
			this.typeRefs.set(key, this.typeRefs.size);
			this.writer.writeU8(T_TYPE_NEW);
			this._writeString(request);
			this.write(name);
		} else {
			this.writer.writeU8(T_TYPE_REF);
			this.writer.writeVarUint(typeRef);
		}
		this.cycleStack.add(value);
		try {
			codec.encode(value, this);
		} finally {
			this.cycleStack.delete(value);
		}
		this._addObjectReference(value);
	}

	/**
	 * @param {EXPECTED_ANY} value value
	 * @returns {void}
	 */
	_write(value) {
		if (value === null) {
			this.writer.writeU8(T_NULL);
			return;
		}
		switch (typeof value) {
			case "undefined":
				this.writer.writeU8(T_UNDEFINED);
				return;
			case "boolean":
				this.writer.writeU8(value ? T_TRUE : T_FALSE);
				return;
			case "number":
				this._writeNumber(value);
				return;
			case "bigint":
				this.writer.writeU8(T_BIGINT);
				this._writeRawString(value.toString());
				return;
			case "string":
				this._writeString(value);
				return;
			case "function":
				if (!isLazy(value)) throw new Error(`Unexpected function ${value}`);
				this.writeLazy(value);
				return;
		}
		if (Buffer.isBuffer(value)) {
			this._writeBuffer(value);
		} else if (Array.isArray(value)) {
			this._writeArray(value);
		} else if (value instanceof Map) {
			this._writeMap(value);
		} else if (value instanceof Set) {
			this._writeSet(value);
		} else if (value instanceof Date) {
			this._writeDate(value);
		} else if (value instanceof RegExp) {
			this._writeRegExp(value);
		} else {
			const proto = Object.getPrototypeOf(value);
			if (proto === Object.prototype) this._writePlainObject(value, false);
			else if (proto === null) this._writePlainObject(value, true);
			else this._writeTypedObject(value);
		}
	}
}

module.exports = Encoder;
