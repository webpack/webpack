"use strict";

const fs = require("fs");
const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const internalSerializables = require("../../lib/util/internalSerializables");

// The generator formats with prettier, which trips Bun's `module` builtin
// ("not an instance of Module"), so this check is Node-only. The per-entry
// require checks below run fine on Bun (loading all 143 costs only a few MB).
const itSkipBun = process.versions.bun ? it.skip : it;

describe("internalSerializables", () => {
	itSkipBun("committed file should match the generator", async () => {
		const {
			TARGET,
			generateInternalSerializables
		} = require("../../tooling/generate-internal-serializables");

		const generated = await generateInternalSerializables();
		const current = fs.readFileSync(TARGET, "utf8");
		if (current !== generated) {
			throw new Error(
				"lib/util/internalSerializables.js is outdated. Run: yarn fix:serializables"
			);
		}
	});

	// A pack written before these moved names them by their old request, which
	// only resolves while lib/ keeps a registerLegacyRequest for it
	for (const [legacy, current] of [
		["webpack/lib/ContextModule", "webpack/lib/context/ContextModule"],
		["webpack/lib/ExternalModule", "webpack/lib/externals/ExternalModule"],
		["webpack/lib/InitFragment", "webpack/lib/template/InitFragment"],
		[
			"webpack/lib/NodeStuffInWebError",
			"webpack/lib/errors/NodeStuffInWebError"
		],
		["webpack/lib/RawDataUrlModule", "webpack/lib/asset/RawDataUrlModule"],
		[
			"webpack/lib/dependencies/ExternalModuleConstDependency",
			"webpack/lib/dependencies/ExternalModuleInitFragmentDependency"
		]
	]) {
		it(`should restore "${legacy}" from a pre-move cache`, () => {
			internalSerializables[
				/** @type {keyof typeof internalSerializables} */
				(legacy.slice("webpack/lib/".length))
			]();

			expect(ObjectMiddleware.getDeserializerFor(legacy, null)).toBe(
				ObjectMiddleware.getDeserializerFor(current, null)
			);
		});
	}

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
