/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("./makeSerializable");

class PathAsKeyMap extends Map {
	serialize({ write, writePathArray }) {
		write(this.size);

		const arr = [];

		for (const key of this.keys()) {
			arr.push(key);
			write(this.get(key));
		}

		writePathArray(arr);
	}

	static deserialize({ read, readPathArray }) {
		const size = read();
		const map = new Map();
		const values = [];

		for (let i = 0; i < size; i++) {
			values.push(read());
		}

		const paths = readPathArray();

		for (let i = 0; i < size; i++) {
			map.set(paths[i], values[i]);
		}

		return Object.setPrototypeOf(map, PathAsKeyMap.prototype);
	}
}

makeSerializable(PathAsKeyMap, "webpack/lib/util/PathAsKeyMap");

module.exports = PathAsKeyMap;
