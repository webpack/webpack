/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("./makeSerializable");

class Path extends String {
	serialize({ writePath }) {
		writePath(this);
	}

	static deserialize({ readPath }) {
		const path = readPath();

		return Object.setPrototypeOf(path, Path.prototype);
	}
}

makeSerializable(Path, "webpack/lib/util/Path");

module.exports = Path;
