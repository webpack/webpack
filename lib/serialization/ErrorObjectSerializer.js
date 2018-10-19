"use strict";

class ErrorObjectSerializer {
	serialize(obj, { write }) {
		write(obj.name);
		write(obj.message);
		write(obj.stack);
	}

	deserialize({ read }) {
		const err = new Error();

		err.name = read();
		err.message = read();
		err.stack = read();

		return err;
	}
}

module.exports = ErrorObjectSerializer;
