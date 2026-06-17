"use strict";

const ProvideSharedDependency = require("../lib/sharing/ProvideSharedDependency");

describe("ProvideSharedDependency", () => {
	it("round-trips through serialization, keeping version and request distinct", () => {
		const dep = new ProvideSharedDependency(
			"scope",
			"my-name",
			"1.2.3",
			"./my-request",
			true
		);

		/** @type {unknown[]} */
		const buffer = [];
		const writeCtx =
			/** @type {import("../lib/serialization/ObjectMiddleware").ObjectSerializerContext} */ (
				/** @type {unknown} */ ({
					write(/** @type {unknown} */ v) {
						buffer.push(v);
						return writeCtx;
					},
					setCircularReference() {}
				})
			);
		dep.serialize(writeCtx);

		let i = 0;
		const readCtx =
			/** @type {import("../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} */ (
				/** @type {unknown} */ ({
					read: () => buffer[i++],
					get rest() {
						return readCtx;
					},
					setCircularReference() {}
				})
			);
		const restored = ProvideSharedDependency.deserialize(readCtx);

		expect(restored.shareScope).toBe("scope");
		expect(restored.name).toBe("my-name");
		expect(restored.version).toBe("1.2.3");
		expect(restored.request).toBe("./my-request");
		expect(restored.eager).toBe(true);
	});
});
