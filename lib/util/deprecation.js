/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

/** @type {Map<string, Function>} */
const deprecationCache = new Map();

/**
 * @typedef {Object} FakeHookMarker
 * @property {true} _fakeHook it's a fake hook
 */

/** @template T @typedef {T & FakeHookMarker} FakeHook<T> */

/**
 * @param {string} message deprecation message
 * @param {string} code deprecation code
 * @returns {Function} function to trigger deprecation
 */
const createDeprecation = (message, code) => {
	const cached = deprecationCache.get(message);
	if (cached !== undefined) return cached;
	const fn = util.deprecate(
		() => {},
		message,
		"DEP_WEBPACK_DEPRECATION_" + code
	);
	deprecationCache.set(message, fn);
	return fn;
};

const COPY_METHODS = [
	"concat",
	"entry",
	"filter",
	"find",
	"findIndex",
	"includes",
	"indexOf",
	"join",
	"lastIndexOf",
	"map",
	"reduce",
	"reduceRight",
	"slice",
	"some"
];

const DISABLED_METHODS = [
	"copyWithin",
	"entries",
	"fill",
	"keys",
	"pop",
	"reverse",
	"shift",
	"splice",
	"sort",
	"unshift"
];

/**
 * @param {any} set new set
 * @param {string} name property name
 * @returns {void}
 */
exports.arrayToSetDeprecation = (set, name) => {
	for (const method of COPY_METHODS) {
		if (set[method]) continue;
		const d = createDeprecation(
			`${name} was changed from Array to Set (using Array method '${method}' is deprecated)`,
			"ARRAY_TO_SET"
		);
		/**
		 * @deprecated
		 * @this {Set}
		 * @returns {number} count
		 */
		set[method] = function () {
			d();
			const array = Array.from(this);
			return Array.prototype[method].apply(array, arguments);
		};
	}
	const dPush = createDeprecation(
		`${name} was changed from Array to Set (using Array method 'push' is deprecated)`,
		"ARRAY_TO_SET_PUSH"
	);
	const dLength = createDeprecation(
		`${name} was changed from Array to Set (using Array property 'length' is deprecated)`,
		"ARRAY_TO_SET_LENGTH"
	);
	const dIndexer = createDeprecation(
		`${name} was changed from Array to Set (indexing Array is deprecated)`,
		"ARRAY_TO_SET_INDEXER"
	);
	/**
	 * @deprecated
	 * @this {Set}
	 * @returns {number} count
	 */
	set.push = function () {
		dPush();
		for (const item of Array.from(arguments)) {
			this.add(item);
		}
		return this.size;
	};
	for (const method of DISABLED_METHODS) {
		if (set[method]) continue;
		set[method] = () => {
			throw new Error(
				`${name} was changed from Array to Set (using Array method '${method}' is not possible)`
			);
		};
	}
	const createIndexGetter = index => {
		/**
		 * @this {Set} a Set
		 * @returns {any} the value at this location
		 */
		const fn = function () {
			dIndexer();
			let i = 0;
			for (const item of this) {
				if (i++ === index) return item;
			}
			return undefined;
		};
		return fn;
	};
	const defineIndexGetter = index => {
		Object.defineProperty(set, index, {
			get: createIndexGetter(index),
			set(value) {
				throw new Error(
					`${name} was changed from Array to Set (indexing Array with write is not possible)`
				);
			}
		});
	};
	defineIndexGetter(0);
	let indexerDefined = 1;
	Object.defineProperty(set, "length", {
		get() {
			dLength();
			const length = this.size;
			for (indexerDefined; indexerDefined < length + 1; indexerDefined++) {
				defineIndexGetter(indexerDefined);
			}
			return length;
		},
		set(value) {
			throw new Error(
				`${name} was changed from Array to Set (writing to Array property 'length' is not possible)`
			);
		}
	});
	set[Symbol.isConcatSpreadable] = true;
};

exports.createArrayToSetDeprecationSet = name => {
	class SetDeprecatedArray extends Set {}
	exports.arrayToSetDeprecation(SetDeprecatedArray.prototype, name);
	return SetDeprecatedArray;
};

exports.soonFrozenObjectDeprecation = (obj, name, code, note = "") => {
	const message = `${name} will be frozen in future, all modifications are deprecated.${
		note && `\n${note}`
	}`;
	return new Proxy(obj, {
		set: util.deprecate(
			(target, property, value, receiver) =>
				Reflect.set(target, property, value, receiver),
			message,
			code
		),
		defineProperty: util.deprecate(
			(target, property, descriptor) =>
				Reflect.defineProperty(target, property, descriptor),
			message,
			code
		),
		deleteProperty: util.deprecate(
			(target, property) => Reflect.deleteProperty(target, property),
			message,
			code
		),
		setPrototypeOf: util.deprecate(
			(target, proto) => Reflect.setPrototypeOf(target, proto),
			message,
			code
		)
	});
};

/**
 * @template T
 * @param {T} obj object
 * @param {string} message deprecation message
 * @param {string} code deprecation code
 * @returns {T} object with property access deprecated
 */
const deprecateAllProperties = (obj, message, code) => {
	const newObj = {};
	const descriptors = Object.getOwnPropertyDescriptors(obj);
	for (const name of Object.keys(descriptors)) {
		const descriptor = descriptors[name];
		if (typeof descriptor.value === "function") {
			Object.defineProperty(newObj, name, {
				...descriptor,
				value: util.deprecate(descriptor.value, message, code)
			});
		} else if (descriptor.get || descriptor.set) {
			Object.defineProperty(newObj, name, {
				...descriptor,
				get: descriptor.get && util.deprecate(descriptor.get, message, code),
				set: descriptor.set && util.deprecate(descriptor.set, message, code)
			});
		} else {
			let value = descriptor.value;
			Object.defineProperty(newObj, name, {
				configurable: descriptor.configurable,
				enumerable: descriptor.enumerable,
				get: util.deprecate(() => value, message, code),
				set: descriptor.writable
					? util.deprecate(v => (value = v), message, code)
					: undefined
			});
		}
	}
	return /** @type {T} */ (newObj);
};
exports.deprecateAllProperties = deprecateAllProperties;

/**
 * @template T
 * @param {T} fakeHook fake hook implementation
 * @param {string=} message deprecation message (not deprecated when unset)
 * @param {string=} code deprecation code (not deprecated when unset)
 * @returns {FakeHook<T>} fake hook which redirects
 */
exports.createFakeHook = (fakeHook, message, code) => {
	if (message && code) {
		fakeHook = deprecateAllProperties(fakeHook, message, code);
	}
	return Object.freeze(
		Object.assign(fakeHook, { _fakeHook: /** @type {true} */ (true) })
	);
};
