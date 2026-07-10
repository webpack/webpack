"use strict";

const ExternalModule = require("../lib/ExternalModule");
const ExternalModuleFactoryPlugin = require("../lib/ExternalModuleFactoryPlugin");

/** @typedef {import("../declarations/WebpackOptions").Externals} Externals */

/**
 * @param {ExternalModule} mod the module to build
 * @returns {ExternalModule} the same module, built
 */
const buildModule = (mod) => {
	/** @type {(Error | null)=} */
	let error;
	mod.build(
		/** @type {EXPECTED_ANY} */ ({}),
		/** @type {EXPECTED_ANY} */ ({ outputOptions: { module: false } }),
		/** @type {EXPECTED_ANY} */ (null),
		/** @type {EXPECTED_ANY} */ (null),
		(err) => {
			error = err;
		}
	);
	if (error) throw error;
	return mod;
};

/**
 * Serialize a module and deserialize it into a fresh instance using an
 * in-memory store, so the round-trip exercises serialize/deserialize.
 * @param {ExternalModule} mod the module to round-trip
 * @returns {ExternalModule} the deserialized module
 */
const roundTrip = (mod) => {
	/** @type {EXPECTED_ANY[]} */
	const store = [];
	const writeCtx = {
		write: (/** @type {EXPECTED_ANY} */ value) => {
			store.push(value);
			return writeCtx;
		}
	};
	mod.serialize(/** @type {EXPECTED_ANY} */ (writeCtx));
	let i = 0;
	const readCtx = { read: () => store[i++] };
	Object.defineProperty(readCtx, "rest", { get: () => readCtx });
	const out = new ExternalModule("", "amd", "");
	out.deserialize(/** @type {EXPECTED_ANY} */ (readCtx));
	return out;
};

describe("ExternalModule interop", () => {
	it("stores the interop option and defaults it to undefined", () => {
		expect(
			new ExternalModule({ amd: "ext" }, "amd", "ext", undefined, "esModule")
				.interop
		).toBe("esModule");
		expect(new ExternalModule("ext", "amd", "ext").interop).toBeUndefined();
	});

	it("makes the exports a namespace for interop 'esModule'", () => {
		const mod = buildModule(
			new ExternalModule({ amd: "ext" }, "amd", "ext", undefined, "esModule")
		);
		expect(/** @type {EXPECTED_ANY} */ (mod.buildMeta).exportsType).toBe(
			"namespace"
		);
	});

	it("keeps the whole exports as default for interop 'default'", () => {
		const mod = buildModule(
			new ExternalModule({ amd: "ext" }, "amd", "ext", undefined, "default")
		);
		const buildMeta = /** @type {EXPECTED_ANY} */ (mod.buildMeta);
		expect(buildMeta.exportsType).toBe("default");
		expect(buildMeta.defaultObject).toBe("redirect");
	});

	it("leaves the exports dynamic without interop", () => {
		const mod = buildModule(new ExternalModule("ext", "amd", "ext"));
		expect(/** @type {EXPECTED_ANY} */ (mod.buildMeta).exportsType).toBe(
			"dynamic"
		);
	});

	it("reflects interop in identifier and hash", () => {
		const mod = new ExternalModule(
			{ amd: "ext" },
			"amd",
			"ext",
			undefined,
			"default"
		);
		expect(mod.identifier()).toContain("|interop=default");
		expect(new ExternalModule("ext", "amd", "ext").identifier()).not.toContain(
			"interop"
		);
		/** @type {EXPECTED_ANY[]} */
		const updates = [];
		const hash = {
			update: (/** @type {EXPECTED_ANY} */ value) => {
				updates.push(value);
				return hash;
			}
		};
		mod.updateHash(
			/** @type {EXPECTED_ANY} */ (hash),
			/** @type {EXPECTED_ANY} */ ({
				chunkGraph: {
					getModuleGraphHash: () => "",
					moduleGraph: { getIncomingConnections: () => [] }
				},
				runtime: undefined
			})
		);
		expect(updates).toContain("|interop=default");
	});

	it("preserves interop through serialization", () => {
		const mod = buildModule(
			new ExternalModule({ amd: "ext" }, "amd", "ext", undefined, "esModule")
		);
		expect(roundTrip(mod).interop).toBe("esModule");
	});
});

describe("ExternalModuleFactoryPlugin interop", () => {
	/**
	 * @param {Externals} externals the externals config to factorize "ext" against
	 * @returns {ExternalModule} the produced external module
	 */
	const factorize = (externals) => {
		/** @type {EXPECTED_FUNCTION=} */
		let tapped;
		new ExternalModuleFactoryPlugin("amd", externals).apply(
			/** @type {EXPECTED_ANY} */ ({
				hooks: {
					factorize: {
						tapAsync: (
							/** @type {EXPECTED_ANY} */ name,
							/** @type {EXPECTED_FUNCTION} */ fn
						) => {
							tapped = fn;
						}
					}
				}
			})
		);
		/** @type {ExternalModule=} */
		let result;
		/** @type {EXPECTED_FUNCTION} */
		(tapped)(
			{
				context: "/ctx",
				contextInfo: {},
				dependencies: [{ request: "ext" }],
				dependencyType: "esm"
			},
			(
				/** @type {(Error | null)=} */ err,
				/** @type {ExternalModule=} */ mod
			) => {
				result = mod;
			}
		);
		if (!result) throw new Error("no external module produced");
		return result;
	};

	it("extracts the interop key and keeps the request a type map", () => {
		const mod = factorize({ ext: { amd: "ext", interop: "esModule" } });
		expect(mod).toBeInstanceOf(ExternalModule);
		expect(mod.interop).toBe("esModule");
		expect(mod.request).toEqual({ amd: "ext" });
	});

	it("leaves interop undefined for a plain external", () => {
		expect(factorize({ ext: "ext" }).interop).toBeUndefined();
	});
});
