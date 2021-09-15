/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class FallbackDependency extends Dependency {
	constructor(requests) {
		super();
		this.requests = requests;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `fallback ${this.requests.join(" ")}`;
	}

	get type() {
		return "fallback";
	}

	get category() {
		return "esm";
	}

	serialize(context) {
		const { write } = context;
		write(this.requests);
		super.serialize(context);
	}

	static deserialize(context) {
		const { read } = context;
		const obj = new FallbackDependency(read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	FallbackDependency,
	"webpack/lib/container/FallbackDependency"
);

module.exports = FallbackDependency;
