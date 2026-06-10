"use strict";

const internalSerializables = require("../lib/util/internalSerializables");

describe("internalSerializables", () => {
	// Guards against entries whose `require` path doesn't resolve — such a typo
	// only surfaces when deserializing a cold cache without the owning plugin loaded
	for (const [request, loader] of Object.entries(internalSerializables)) {
		it(`should load "${request}"`, () => {
			expect(loader).not.toThrow();
		});
	}
});
