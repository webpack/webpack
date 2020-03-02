/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("./makeSerializable");

class PathMap extends Map {
	serialize({ write, writePathArray }) {
		write(this.size);

		const keys = Array.from(this.keys());

		writePathArray(keys);

		const values = [];

		for (const key of keys) {
			values.push(this.get(key));
		}

		writePathArray(values);
	}

	static deserialize({ read, readPathArray }) {
		const size = read();
		const map = new Map();
		const keys = readPathArray();
		const values = readPathArray();

		for (let i = 0; i < size; i++) {
			map.set(keys[i], values[i]);
		}

		return Object.setPrototypeOf(map, PathMap.prototype);
	}
}

makeSerializable(PathMap, "webpack/lib/util/PathMap");

module.exports = PathMap;
