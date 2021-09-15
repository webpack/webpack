/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class ArraySerializer {
	serialize(array, { write }) {
		write(array.length);
		for (const item of array) write(item);
	}
	deserialize({ read }) {
		const length = read();
		const array = [];
		for (let i = 0; i < length; i++) {
			array.push(read());
		}
		return array;
	}
}

module.exports = ArraySerializer;
