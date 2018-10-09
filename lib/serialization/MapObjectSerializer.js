/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class MapObjectSerializer {
	serialize(obj, { write }) {
		write(obj.size);
		for (const [key, value] of obj) {
			write(key);
			write(value);
		}
	}
	deserialize({ read }) {
		let size = read();
		const map = new Map();
		for (let i = 0; i < size; i++) {
			map.set(read(), read());
		}
		return map;
	}
}

module.exports = MapObjectSerializer;
