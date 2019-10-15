/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class MapObjectSerializer {
	serialize(obj, { write }) {
		write(obj.size);
		for (const key of obj.keys()) {
			write(key);
		}
		for (const value of obj.values()) {
			write(value);
		}
	}
	deserialize({ read }) {
		let size = read();
		const map = new Map();
		const keys = [];
		for (let i = 0; i < size; i++) {
			keys.push(read());
		}
		for (let i = 0; i < size; i++) {
			map.set(keys[i], read());
		}
		return map;
	}
}

module.exports = MapObjectSerializer;
