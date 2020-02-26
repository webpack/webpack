/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("./makeSerializable");
const LazySet = require("./LazySet");

class PathLazySet extends LazySet {
	serialize({ writePathSet }) {
		if (this._needMerge) this._merge();

		writePathSet(this._set);
	}

	static deserialize({ readPathSet }) {
		const set = readPathSet();

		return new LazySet(set);
	}
}

makeSerializable(PathLazySet, "webpack/lib/util/PathLazySet");

module.exports = PathLazySet;
