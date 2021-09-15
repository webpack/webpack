/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class RegExpObjectSerializer {
	serialize(obj, { write }) {
		write(obj.source);
		write(obj.flags);
	}
	deserialize({ read }) {
		return new RegExp(read(), read());
	}
}

module.exports = RegExpObjectSerializer;
