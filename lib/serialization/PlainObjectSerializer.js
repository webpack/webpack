/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const writeObject = (obj, write, values) => {
	const keys = Object.keys(obj);
	for (const key of keys) {
		const value = obj[key];
		if (
			value !== null &&
			typeof value === "object" &&
			value.constructor &&
			value.constructor === Object
		) {
			// nested object
			write(true);
			write(key);
			writeObject(value, write, values);
			write(false);
		} else {
			write(key);
			values.push(value);
		}
	}
};

class PlainObjectSerializer {
	serialize(obj, { write }) {
		if (Array.isArray(obj)) {
			write(obj.length);
			for (const item of obj) {
				write(item);
			}
		} else {
			const values = [];
			writeObject(obj, write, values);
			write(null);
			for (const value of values) {
				write(value);
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
			const keys = [];
			let hasNested = key === true;
			while (key !== null) {
				keys.push(key);
				key = read();
				if (key === true) {
					hasNested = true;
				}
			}
			let currentObj = {};
			const stack = hasNested && [];
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				if (key === true) {
					// enter nested object
					const objectKey = keys[++i];
					const newObj = {};
					currentObj[objectKey] = newObj;
					stack.push(currentObj);
					currentObj = newObj;
				} else if (key === false) {
					// leave nested object
					currentObj = stack.pop();
				} else {
					currentObj[key] = read();
				}
			}
			return currentObj;
		}
	}
}

module.exports = PlainObjectSerializer;
