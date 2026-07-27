"use strict";

const fs = require("fs");
const internalSerializables = require("../lib/util/internalSerializables");

// The generator formats with prettier, which trips Bun's `module` builtin
// ("not an instance of Module"), so this check is Node-only. The per-entry
// require checks below run fine on Bun (loading all 143 costs only a few MB).
const itSkipBun = process.versions.bun ? it.skip : it;

describe("internalSerializables", () => {
	itSkipBun("committed file should match the generator", async () => {
		const {
			TARGET,
			generateInternalSerializables
		} = require("../tooling/generate-internal-serializables");

		const generated = await generateInternalSerializables();
		const current = fs.readFileSync(TARGET, "utf8");
		if (current !== generated) {
			throw new Error(
				"lib/util/internalSerializables.js is outdated. Run: yarn fix:serializables"
			);
		}
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
