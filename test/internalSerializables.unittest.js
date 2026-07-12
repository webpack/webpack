"use strict";

const internalSerializables = require("../lib/util/internalSerializables");

describe("internalSerializables", () => {
	it('should map "Module" to webpack/lib/Module', () => {
		expect(internalSerializables.Module).toBeDefined();
	});

	it('should not expose a stale "errors/Module" entry', () => {
		expect(
			Object.prototype.hasOwnProperty.call(
				internalSerializables,
				"errors/Module"
			)
		).toBe(false);
	});

	// Guards against entries whose `require` path doesn't resolve — such a typo
	// only surfaces when deserializing a cold cache without the owning plugin loaded
	for (const [request, loader] of Object.entries(internalSerializables)) {
		it(`should load "${request}"`, () => {
			expect(loader).not.toThrow();
		});
	}
});
