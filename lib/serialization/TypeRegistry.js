/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NOT_SERIALIZABLE = {};
const serializers = new Map();
const serializersByKey = new Map();
const loaders = new Map();
const loadedRequests = new Set();

/** @typedef {{ encode: (value: EXPECTED_ANY, encoder: import("./Encoder")) => void, decode: (decoder: import("./Decoder")) => EXPECTED_ANY }} Codec */
/** @typedef {{ request: string, name: string | null, codec: Codec }} SerializerConfig */

/**
 * @param {string} request request
 * @param {string | null} name name
 * @returns {string} key
 */
const keyFor = (request, name) => `${request}/${name}`;

/**
 * @param {EXPECTED_ANY} Constructor constructor
 * @param {string} request request
 * @param {string | null} name name
 * @param {Codec} codec codec
 * @param {boolean=} allowOverride allow override
 * @returns {void}
 */
const register = (Constructor, request, name, codec, allowOverride = false) => {
	const key = keyFor(request, name);
	if (!allowOverride && serializers.has(Constructor)) {
		throw new Error(
			`TypeRegistry.register: serializer for ${
				Constructor ? Constructor.name : "null"
			} is already registered`
		);
	}
	if (!allowOverride && serializersByKey.has(key)) {
		throw new Error(
			`TypeRegistry.register: serializer for ${key} is already registered`
		);
	}
	serializers.set(Constructor, { request, name, codec });
	serializersByKey.set(key, codec);
};

/**
 * @param {EXPECTED_ANY} Constructor constructor
 * @param {string} request request
 * @param {string | null} name name
 * @param {Codec} codec codec
 * @returns {void}
 */
const registerBuiltin = (Constructor, request, name, codec) => {
	register(Constructor, request, name, codec, true);
};

/**
 * @param {EXPECTED_ANY} Constructor constructor
 * @returns {void}
 */
const registerNotSerializable = (Constructor) => {
	if (serializers.has(Constructor)) {
		throw new Error(
			`TypeRegistry.registerNotSerializable: serializer for ${Constructor.name} is already registered`
		);
	}
	serializers.set(Constructor, NOT_SERIALIZABLE);
};

/**
 * @param {RegExp} regExp request matcher
 * @param {(request: string) => boolean} loader loader
 * @returns {void}
 */
const registerLoader = (regExp, loader) => {
	loaders.set(regExp, loader);
};

/**
 * @param {EXPECTED_ANY} object object
 * @returns {SerializerConfig} serializer config
 */
const getSerializerFor = (object) => {
	const proto = Object.getPrototypeOf(object);
	/** @type {EXPECTED_ANY} */
	let Constructor;
	if (proto === null) {
		Constructor = null;
	} else {
		Constructor = proto.constructor;
		if (!Constructor) {
			throw new Error(
				"Serialization of objects with prototype without valid constructor property not possible"
			);
		}
	}
	let config = serializers.get(Constructor);
	if (!config && object instanceof Error) config = serializers.get(Error);
	if (!config) {
		throw new Error(
			`No serializer registered for ${Constructor ? Constructor.name : "null"}`
		);
	}
	if (config === NOT_SERIALIZABLE) throw NOT_SERIALIZABLE;
	return config;
};

/**
 * @param {string} request request
 * @returns {void}
 */
const ensureLoaded = (request) => {
	if (!request || loadedRequests.has(request)) return;
	let loaded = false;
	for (const [regExp, loader] of loaders) {
		if (regExp.test(request) && loader(request)) {
			loaded = true;
			break;
		}
	}
	if (!loaded) require(request);
	loadedRequests.add(request);
};

/**
 * @param {string} request request
 * @param {string | null} name name
 * @returns {Codec} codec
 */
const getDeserializerFor = (request, name) => {
	let codec = serializersByKey.get(keyFor(request, name));
	if (codec === undefined) {
		ensureLoaded(request);
		codec = serializersByKey.get(keyFor(request, name));
	}
	if (codec === undefined) {
		throw new Error(`No deserializer registered for ${keyFor(request, name)}`);
	}
	return codec;
};

/**
 * @param {string} request request
 * @param {string | null} name name
 * @returns {Codec | undefined} codec
 */
const getDeserializerForWithoutError = (request, name) =>
	serializersByKey.get(keyFor(request, name));

const entries = () => serializers.entries();

const api = {
	NOT_SERIALIZABLE,
	register,
	registerBuiltin,
	registerNotSerializable,
	registerLoader,
	getSerializerFor,
	getDeserializerFor,
	getDeserializerForWithoutError,
	entries
};

require("./builtins").registerBuiltins(api);

module.exports = api;
