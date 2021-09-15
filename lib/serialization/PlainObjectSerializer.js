/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const cache = new WeakMap();

class ObjectStructure {
	constructor() {
		this.keys = undefined;
		this.children = undefined;
	}

	getKeys(keys) {
		if (this.keys === undefined) this.keys = keys;
		return this.keys;
	}

	key(key) {
		if (this.children === undefined) this.children = new Map();
		const child = this.children.get(key);
		if (child !== undefined) return child;
		const newChild = new ObjectStructure();
		this.children.set(key, newChild);
		return newChild;
	}
}

const getCachedKeys = (keys, cacheAssoc) => {
	let root = cache.get(cacheAssoc);
	if (root === undefined) {
		root = new ObjectStructure();
		cache.set(cacheAssoc, root);
	}
	let current = root;
	for (const key of keys) {
		current = current.key(key);
	}
	return current.getKeys(keys);
};

class PlainObjectSerializer {
	serialize(obj, { write }) {
		const keys = Object.keys(obj);
		if (keys.length > 128) {
			// Objects with so many keys are unlikely to share structure
			// with other objects
			write(keys);
			for (const key of keys) {
				write(obj[key]);
			}
		} else if (keys.length > 1) {
			write(getCachedKeys(keys, write));
			for (const key of keys) {
				write(obj[key]);
			}
		} else if (keys.length === 1) {
			const key = keys[0];
			write(key);
			write(obj[key]);
		} else {
			write(null);
		}
	}
	deserialize({ read }) {
		const keys = read();
		const obj = {};
		if (Array.isArray(keys)) {
			for (const key of keys) {
				obj[key] = read();
			}
		} else if (keys !== null) {
			obj[keys] = read();
		}
		return obj;
	}
}

module.exports = PlainObjectSerializer;
