"use strict";

const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");
const internalSerializables = require("../../lib/util/internalSerializables");

// WHY: `yarn lint:special` is what compares the committed file with what the
// generator writes and says to run `yarn fix:serializables`. Comparing it here
// too only repeated that report — and, since the generator formats with
// prettier, repeated it as a formatting failure on a prettier bump. What these
// cases state instead is what the committed entries owe a cold cache.
describe("internalSerializables", () => {
	// A pack written before these moved names them by their old request, which
	// only resolves while lib/ keeps a registerLegacyRequest for it
	for (const [legacy, current, name = null] of [
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
			"webpack/lib/node/ExternalModuleInitFragmentDependency"
		],
		[
			"webpack/lib/ModuleGraph",
			"webpack/lib/graph/ModuleGraph",
			"RestoreProvidedData"
		]
	]) {
		it(`should restore "${legacy}" from a pre-move cache`, () => {
			internalSerializables[
				/** @type {keyof typeof internalSerializables} */
				(legacy.slice("webpack/lib/".length))
			]();

			expect(ObjectMiddleware.getDeserializerFor(legacy, name)).toBe(
				ObjectMiddleware.getDeserializerFor(current, name)
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
