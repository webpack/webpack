/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const createHash = require("./createHash");

const getPrototypeChain = C => {
	const chain = [];
	let current = C.prototype;
	while (current !== Object.prototype) {
		chain.push(current);
		current = Object.getPrototypeOf(current);
	}
	return chain;
};

class ClassSerializer {
	constructor(Constructor) {
		this.Constructor = Constructor;
		this.hash = null;
	}

	_createHash() {
		const hash = createHash("md4");
		const prototypeChain = getPrototypeChain(this.Constructor);
		if (typeof this.Constructor.deserialize === "function")
			hash.update(this.Constructor.deserialize.toString());
		for (const p of prototypeChain) {
			if (typeof p.serialize === "function") {
				hash.update(p.serialize.toString());
			}
			if (typeof p.deserialize === "function") {
				hash.update(p.deserialize.toString());
			}
		}
		this.hash = hash.digest("base64");
	}

	serialize(obj, context) {
		if (!this.hash) this._createHash();
		context.write(this.hash);
		obj.serialize(context);
	}

	deserialize(context) {
		if (!this.hash) this._createHash();
		const hash = context.read();
		if (this.hash !== hash)
			throw new Error(`Version missmatch for ${this.Constructor.name}`);
		if (typeof this.Constructor.deserialize === "function") {
			return this.Constructor.deserialize(context);
		}
		const obj = new this.Constructor();
		obj.deserialize(context);
		return obj;
	}
}

module.exports = (Constructor, request, name = null) => {
	ObjectMiddleware.register(
		Constructor,
		request,
		name,
		new ClassSerializer(Constructor)
	);
};
