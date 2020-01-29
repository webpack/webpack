/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const cache = new WeakMap();

class ObjectStructure {
	constructor(keys) {
		this.keys = keys;
		this.children = new Map();
	}

	getKeys() {
		return this.keys;
	}

	key(key) {
		const child = this.children.get(key);
		if (child !== undefined) return child;
		const newChild = new ObjectStructure(this.keys.concat(key));
		this.children.set(key, newChild);
		return newChild;
	}
}

const getCachedKeys = (keys, cacheAssoc) => {
	let root = cache.get(cacheAssoc);
	if (root === undefined) {
		root = new ObjectStructure([]);
		cache.set(cacheAssoc, root);
	}
	let current = root;
	for (const key of keys) {
		current = current.key(key);
	}
	return current.getKeys();
};

class PlainObjectSerializer {
	serialize(obj, { write }) {
		const keys = Object.keys(obj);
		if (keys.length > 1) {
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
