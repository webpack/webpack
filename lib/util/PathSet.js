/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("./makeSerializable");

class PathSet extends Set {
	serialize({ writePathSet }) {
		writePathSet(this);
	}

	static deserialize({ readPathSet }) {
		const set = readPathSet();

		return Object.setPrototypeOf(set, PathSet.prototype);
	}
}

makeSerializable(PathSet, "webpack/lib/util/PathSet");

module.exports = PathSet;
