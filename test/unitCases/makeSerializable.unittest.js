"use strict";

const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const makeSerializable = require("../../lib/util/makeSerializable");

/** @typedef {import("../../lib/serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */

const REQUEST = "webpack/test/unitCases/makeSerializable";

/**
 * A deserializer context reading the given values in order.
 * @param {string[]} values what `read` gives
 * @returns {ObjectDeserializerContext} the context
 */
const reading = (values) => {
	let i = 0;
	return /** @type {ObjectDeserializerContext} */ (
		/** @type {Partial<ObjectDeserializerContext>} */ ({
			read: () => values[i++]
		})
	);
};

class ReadByInstance {
	constructor() {
		/** @type {string | undefined} */
		this.value = undefined;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.value);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize({ read }) {
		this.value = /** @type {string} */ (read());
	}
}
// A static `deserialize` left unset is not one to call. Defined outside the
// class, as Node 10 does not parse a static class field.
Reflect.defineProperty(ReadByInstance, "deserialize", { value: undefined });
makeSerializable(ReadByInstance, REQUEST, "ReadByInstance");

class ReadByClass {
	/**
	 * @param {string} value value
	 */
	constructor(value) {
		this.value = value;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.value);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {ReadByClass} the instance
	 */
	static deserialize({ read }) {
		return new ReadByClass(`static ${read()}`);
	}
}
makeSerializable(ReadByClass, REQUEST, "ReadByClass");

describe("makeSerializable", () => {
	it("reads through the instance when the static `deserialize` is unset", () => {
		const restored = ObjectMiddleware.getDeserializerFor(
			REQUEST,
			"ReadByInstance"
		).deserialize(reading(["a"]));
		expect(restored).toBeInstanceOf(ReadByInstance);
		expect(/** @type {ReadByInstance} */ (restored).value).toBe("a");
	});

	it("reads through the static `deserialize` when the class has one", () => {
		const restored = ObjectMiddleware.getDeserializerFor(
			REQUEST,
			"ReadByClass"
		).deserialize(reading(["b"]));
		expect(restored).toBeInstanceOf(ReadByClass);
		expect(/** @type {ReadByClass} */ (restored).value).toBe("static b");
	});
});
