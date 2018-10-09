/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class PlainObjectSerializer {
	serialize(obj, { write }) {
		if (Array.isArray(obj)) {
			write(obj.length);
			for (const item of obj) {
				write(item);
			}
		} else {
			const keys = Object.keys(obj);
			for (const key of keys) {
				write(key);
			}
			write(null);
			for (const key of keys) {
				write(obj[key]);
			}
		}
	}
	deserialize({ read }) {
		let key = read();
		if (typeof key === "number") {
			const array = [];
			for (let i = 0; i < key; i++) {
				array.push(read());
			}
			return array;
		} else {
			const obj = {};
			const keys = [];
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
}

module.exports = PlainObjectSerializer;
