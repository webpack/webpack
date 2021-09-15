/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class ErrorObjectSerializer {
	constructor(Type) {
		this.Type = Type;
	}

	serialize(obj, { write }) {
		write(obj.message);
		write(obj.stack);
	}

	deserialize({ read }) {
		const err = new this.Type();

		err.message = read();
		err.stack = read();

		return err;
	}
}

module.exports = ErrorObjectSerializer;
