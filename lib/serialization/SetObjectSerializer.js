/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class SetObjectSerializer {
	serialize(obj, { write }) {
		write(obj.size);
		for (const value of obj) {
			write(value);
		}
	}
	deserialize({ read }) {
		let size = read();
		const set = new Set();
		for (let i = 0; i < size; i++) {
			set.add(read());
		}
		return set;
	}
}

module.exports = SetObjectSerializer;
