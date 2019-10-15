/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { register } = require("./serialization");

class ClassSerializer {
	constructor(Constructor) {
		this.Constructor = Constructor;
		this.hash = null;
	}

	serialize(obj, context) {
		obj.serialize(context);
	}

	deserialize(context) {
		if (typeof this.Constructor.deserialize === "function") {
			return this.Constructor.deserialize(context);
		}
		const obj = new this.Constructor();
		obj.deserialize(context);
		return obj;
	}
}

module.exports = (Constructor, request, name = null) => {
	register(Constructor, request, name, new ClassSerializer(Constructor));
};
