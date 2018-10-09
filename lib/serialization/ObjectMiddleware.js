/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const MapObjectSerializer = require("./MapObjectSerializer");
const PlainObjectSerializer = require("./PlainObjectSerializer");
const SerializerMiddleware = require("./SerializerMiddleware");
const SetObjectSerializer = require("./SetObjectSerializer");

/** @typedef {new (...params: any[]) => any} Constructor */

/*

Format:

File -> Section*
Section -> ObjectSection | ReferenceSection | EscapeSection | OtherSection

ObjectSection -> ESCAPE (
	null number:relativeOffset |
	string:request (string|null):export
) Section:value* ESCAPE ESCAPE_END_OBJECT
ReferenceSection -> ESCAPE number:relativeOffset
EscapeSection -> ESCAPE ESCAPE_ESCAPE_VALUE (escaped value ESCAPE)
EscapeSection -> ESCAPE ESCAPE_UNDEFINED (escaped value ESCAPE)
OtherSection -> any (except ESCAPE)

Why using null as escape value?
Multiple null values can merged by the BinaryMiddleware, which makes it very efficient
Technically any value can be used.

*/

/**
 * @typedef {Object} ObjectSerializerContext
 * @property {function(any): void} write
 */

/**
 * @typedef {Object} ObjectDeserializerContext
 * @property {function(): any} read
 */

/**
 * @typedef {Object} ObjectSerializer
 * @property {function(any, ObjectSerializerContext): void} serialize
 * @property {function(ObjectDeserializerContext): any} deserialize
 */

const ESCAPE = null;
const ESCAPE_ESCAPE_VALUE = 1;
const ESCAPE_END_OBJECT = 2;
const ESCAPE_UNDEFINED = 3;

const CURRENT_VERSION = 1;

const plainObjectSerializer = new PlainObjectSerializer();
const mapObjectSerializer = new MapObjectSerializer();
const setObjectSerializer = new SetObjectSerializer();

const serializers = new Map();
const serializerInversed = new Map();

const loadedRequests = new Set();

serializers.set(Object, {
	request: null,
	name: null,
	serializer: plainObjectSerializer
});
serializers.set(Array, {
	request: null,
	name: null,
	serializer: plainObjectSerializer
});
serializers.set(Map, {
	request: null,
	name: 1,
	serializer: mapObjectSerializer
});
serializers.set(Set, {
	request: null,
	name: 2,
	serializer: setObjectSerializer
});
for (const { request, name, serializer } of serializers.values()) {
	serializerInversed.set(`${request}/${name}`, serializer);
}

class ObjectMiddleware extends SerializerMiddleware {
	/**
	 * @param {Constructor} Constructor the constructor
	 * @param {string} request the request which will be required when deserializing
	 * @param {string} name the name to make multiple serializer unique when sharing a request
	 * @param {ObjectSerializer} serializer the serializer
	 * @returns {void}
	 */
	static register(Constructor, request, name, serializer) {
		const key = request + "/" + name;
		if (serializers.has(Constructor)) {
			throw new Error(
				`ObjectMiddleware.register: serializer for ${
					Constructor.name
				} is already registered`
			);
		}
		if (serializerInversed.has(key)) {
			throw new Error(
				`ObjectMiddleware.register: serializer for ${key} is already registered`
			);
		}
		serializers.set(Constructor, {
			request,
			name,
			serializer
		});
		serializerInversed.set(key, serializer);
	}

	static getSerializerFor(object) {
		const c = object.constructor;
		const config = serializers.get(c);
		if (!config) throw new Error(`No serializer registered for ${c.name}`);
		return config;
	}

	static getDeserializerFor(request, name) {
		const key = request + "/" + name;
		const serializer = serializerInversed.get(key);
		if (serializer === undefined) {
			throw new Error(`No deserializer registered for ${key}`);
		}
		return serializer;
	}

	_handleFunctionSerialization(fn, context) {
		return () => {
			const r = fn();
			if (r instanceof Promise)
				return r.then(data => this.serialize([data], context));
			return this.serialize([r], context);
		};
	}

	_handleFunctionDeserialization(fn, context) {
		return () => {
			const r = fn();
			if (r instanceof Promise)
				return r.then(data => this.deserialize(data, context)[0]);
			return this.deserialize(r, context)[0];
		};
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} serialized data
	 */
	serialize(data, context) {
		/** @type {any[]} */
		const result = [CURRENT_VERSION];
		let currentPos = 0;
		const referenceable = new Map();
		const addReferenceable = item => {
			referenceable.set(item, currentPos++);
		};
		let currentPosTypeLookup = 0;
		const objectTypeLookup = new Map();
		const process = item => {
			const ref = referenceable.get(item);
			if (ref !== undefined) {
				result.push(ESCAPE, ref - currentPos);
				return;
			}
			if (typeof item === "object" && item !== null) {
				const { request, name, serializer } = ObjectMiddleware.getSerializerFor(
					item
				);

				const key = `${request}/${name}`;
				const lastIndex = objectTypeLookup.get(key);
				if (lastIndex === undefined) {
					objectTypeLookup.set(key, currentPosTypeLookup++);
					result.push(ESCAPE, request, name);
				} else {
					result.push(ESCAPE, null, lastIndex - currentPosTypeLookup);
				}
				serializer.serialize(item, {
					write(value) {
						process(value);
					}
				});
				result.push(ESCAPE, ESCAPE_END_OBJECT);
				addReferenceable(item);
			} else if (typeof item === "string") {
				addReferenceable(item);
				result.push(item);
			} else if (Buffer.isBuffer(item)) {
				addReferenceable(item);
				result.push(item);
			} else if (item === ESCAPE) {
				result.push(ESCAPE, ESCAPE_ESCAPE_VALUE);
			} else if (typeof item === "function") {
				result.push(this._handleFunctionSerialization(item));
			} else if (item === undefined) {
				result.push(ESCAPE, ESCAPE_UNDEFINED);
			} else {
				result.push(item);
			}
		};
		for (const item of data) {
			process(item);
		}
		return result;
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} deserialized data
	 */
	deserialize(data, context) {
		let currentDataPos = 0;
		const read = () => {
			if (currentDataPos >= data.length)
				throw new Error("Unexpected end of stream");
			return data[currentDataPos++];
		};
		if (read() !== CURRENT_VERSION)
			throw new Error("Version missmatch, serializer changed");
		let currentPos = 0;
		const referenceable = new Map();
		const addReferenceable = item => {
			referenceable.set(currentPos++, item);
		};
		let currentPosTypeLookup = 0;
		const objectTypeLookup = new Map();
		const result = [];
		const decodeValue = () => {
			const item = read();
			if (item === ESCAPE) {
				const nextItem = read();
				if (nextItem === ESCAPE_ESCAPE_VALUE) {
					return ESCAPE;
				} else if (nextItem === ESCAPE_UNDEFINED) {
					return undefined;
				} else if (nextItem === ESCAPE_END_OBJECT) {
					throw new Error("Unexpected end of object");
				} else if (typeof nextItem === "number") {
					// relative reference
					return referenceable.get(currentPos + nextItem);
				} else {
					let request = nextItem;
					let name = read();
					let serializer;
					if (typeof name === "number" && name < 0) {
						serializer = objectTypeLookup.get(currentPosTypeLookup + name);
					} else {
						if (request && !loadedRequests.has(request)) {
							require(request);
							loadedRequests.add(request);
						}
						serializer = ObjectMiddleware.getDeserializerFor(request, name);
						objectTypeLookup.set(currentPosTypeLookup++, serializer);
					}
					const item = serializer.deserialize({
						read() {
							const item = decodeValue();
							return item;
						}
					});
					const end1 = read();
					if (end1 !== ESCAPE) {
						throw new Error("Expected end of object");
					}
					const end2 = read();
					if (end2 !== ESCAPE_END_OBJECT) {
						throw new Error("Expected end of object");
					}
					addReferenceable(item);
					return item;
				}
			} else if (typeof item === "string") {
				addReferenceable(item);
				return item;
			} else if (Buffer.isBuffer(item)) {
				addReferenceable(item);
				return item;
			} else if (typeof item === "function") {
				return this._handleFunctionDeserialization(item, context);
			} else {
				return item;
			}
		};
		while (currentDataPos < data.length) {
			result.push(decodeValue());
		}
		return result;
	}
}

module.exports = ObjectMiddleware;
