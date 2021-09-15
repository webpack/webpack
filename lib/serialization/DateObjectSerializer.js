/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class DateObjectSerializer {
	serialize(obj, { write }) {
		write(obj.getTime());
	}
	deserialize({ read }) {
		return new Date(read());
	}
}

module.exports = DateObjectSerializer;
