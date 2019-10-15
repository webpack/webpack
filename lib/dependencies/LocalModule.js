/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");

class LocalModule {
	constructor(name, idx) {
		this.name = name;
		this.idx = idx;
		this.used = false;
	}

	flagUsed() {
		this.used = true;
	}

	variableName() {
		return "__WEBPACK_LOCAL_MODULE_" + this.idx + "__";
	}

	serialize(context) {
		const { write } = context;

		write(this.name);
		write(this.idx);
		write(this.used);
	}

	deserialize(context) {
		const { read } = context;

		this.name = read();
		this.idx = read();
		this.used = read();
	}
}

makeSerializable(LocalModule, "webpack/lib/dependencies/LocalModule");

module.exports = LocalModule;
