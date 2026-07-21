"use strict";

const NamespaceFacadeModule = require("../lib/optimize/NamespaceFacadeModule");
const SplitExportModule = require("../lib/optimize/SplitExportModule");

const { FacadeDependency } = NamespaceFacadeModule;

/** @typedef {import("../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../lib/serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const requestShortener = /** @type {import("../lib/RequestShortener")} */ (
	/** @type {unknown} */ ({ shorten: (/** @type {string} */ r) => r })
);

/**
 * Serializes a value and reads it back into a fresh instance through an
 * in-memory store, exercising both serialize and deserialize.
 * @template T
 * @param {{ serialize: (context: ObjectSerializerContext) => void }} value source
 * @param {T} target fresh instance to restore into
 * @returns {T} the restored target
 */
const roundTrip = (value, target) => {
	/** @type {unknown[]} */
	const store = [];
	const writeCtx = /** @type {ObjectSerializerContext} */ (
		/** @type {unknown} */ ({
			write: (/** @type {unknown} */ v) => {
				store.push(v);
			}
		})
	);
	value.serialize(writeCtx);
	let i = 0;
	const readCtx = { read: () => store[i++] };
	Object.defineProperty(readCtx, "rest", { get: () => readCtx });
	/** @type {{ deserialize: (context: ObjectDeserializerContext) => void }} */ (
		target
	).deserialize(/** @type {ObjectDeserializerContext} */ (readCtx));
	return target;
};

describe("SplitExportModule", () => {
	const make = () =>
		new SplitExportModule("host.js", "lazy", "lazy", "const lazy = 1");

	it("derives identifiers from the host and export name", () => {
		const mod = make();
		expect(mod.identifier()).toBe("split-export|host.js|lazy");
		expect(mod.readableIdentifier(requestShortener)).toBe(
			"split export lazy of host.js"
		);
		expect(mod.size()).toBeGreaterThan(0);
	});

	it("needs a build only until built", () => {
		const mod = make();
		mod.needBuild(/** @type {EXPECTED_ANY} */ ({}), (err, need) => {
			expect(err).toBeFalsy();
			expect(need).toBe(true);
		});
		mod.buildMeta = {};
		mod.needBuild(/** @type {EXPECTED_ANY} */ ({}), (err, need) => {
			expect(need).toBe(false);
		});
	});

	it("round-trips through serialization", () => {
		const restored = roundTrip(make(), new SplitExportModule("", "", "", ""));
		expect(restored.hostIdentifier).toBe("host.js");
		expect(restored.exportName).toBe("lazy");
		expect(restored.localName).toBe("lazy");
		expect(restored.declaration).toBe("const lazy = 1");
	});
});

describe("NamespaceFacadeModule", () => {
	const entries = () => [
		{
			exportName: "a",
			sourceModule: /** @type {EXPECTED_ANY} */ ({}),
			sourceName: "a"
		}
	];
	const make = () => new NamespaceFacadeModule("host.js", entries());

	it("derives identifiers from the host", () => {
		const mod = make();
		expect(mod.identifier()).toBe("namespace-facade|host.js");
		expect(mod.readableIdentifier(requestShortener)).toBe(
			"namespace facade of host.js"
		);
		expect(mod.size()).toBe(42);
	});

	it("needs a build only until built", () => {
		const mod = make();
		mod.needBuild(/** @type {EXPECTED_ANY} */ ({}), (err, need) => {
			expect(need).toBe(true);
		});
		mod.buildMeta = {};
		mod.needBuild(/** @type {EXPECTED_ANY} */ ({}), (err, need) => {
			expect(need).toBe(false);
		});
	});

	it("round-trips through serialization", () => {
		const restored = roundTrip(make(), new NamespaceFacadeModule("", []));
		expect(restored.hostIdentifier).toBe("host.js");
		expect(restored.entries).toHaveLength(1);
		expect(restored.entries[0].exportName).toBe("a");
	});
});

describe("FacadeDependency", () => {
	it("exposes its type and referenced export", () => {
		const dep = new FacadeDependency("lazy");
		expect(dep.type).toBe("namespace facade");
		expect(
			dep.getReferencedExports(
				/** @type {EXPECTED_ANY} */ (undefined),
				undefined
			)
		).toEqual([["lazy"]]);
	});

	it("round-trips through serialization", () => {
		const restored = roundTrip(
			new FacadeDependency("lazy"),
			new FacadeDependency("")
		);
		expect(restored.exportName).toBe("lazy");
	});
});
