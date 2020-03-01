/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const LazySet = require("./LazySet");
const makeSerializable = require("./makeSerializable");

class PathLazySet extends LazySet {
	/**
	 * @param {Readonly<Object>} options options
	 */
	serialize({ writePathSet }) {
		if (this._needMerge) this._merge();

		writePathSet(this._set);
	}

	static deserialize({ readPathSet }) {
		const set = readPathSet();

		return new PathLazySet(set);
	}
}

makeSerializable(PathLazySet, "webpack/lib/util/PathLazySet");

module.exports = PathLazySet;
