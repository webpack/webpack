/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class NullPrototypeObjectSerializer {
	serialize(obj, { write }) {
		const keys = Object.keys(obj);
		for (const key of keys) {
			write(key);
		}
		write(null);
		for (const key of keys) {
			write(obj[key]);
		}
	}
	deserialize({ read }) {
		const obj = Object.create(null);
		const keys = [];
		let key = read();
		while (key !== null) {
			keys.push(key);
			key = read();
		}
		for (const key of keys) {
			obj[key] = read();
		}
		return obj;
	}
}

module.exports = NullPrototypeObjectSerializer;
