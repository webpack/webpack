"use strict";

const RuntimeModule = require("../lib/RuntimeModule");
const createHash = require("../lib/util/createHash");

describe("RuntimeModule", () => {
	class TestRuntimeModule extends RuntimeModule {
		constructor(name, stage) {
			super(name, stage);
			this.code = "var test = 1;";
		}

		generate() {
			return this.code;
		}
	}

	it("should update hash with name, stage and generated code", () => {
		const m = new TestRuntimeModule("test", 10);
		const hash = createHash("md4");
		m.updateHash(hash, {
			chunkGraph: {
				getModuleGraphHash: () => "graph-hash"
			}
		});

		const expectedHash = createHash("md4");
		expectedHash.update("test");
		expectedHash.update("10");
		expectedHash.update("var test = 1;");
		expectedHash.update("graph-hash");

		expect(hash.digest("hex")).toBe(expectedHash.digest("hex"));
	});

	it("should cache generated code during updateHash when not fullHash or dependentHash", () => {
		const m = new TestRuntimeModule("test", 0);
		expect(m._cachedGeneratedCode).toBeUndefined();

		const hash = createHash("md4");
		m.updateHash(hash, {
			chunkGraph: {
				getModuleGraphHash: () => ""
			}
		});

		expect(m._cachedGeneratedCode).toBe("var test = 1;");
		expect(m.getGeneratedCode()).toBe("var test = 1;");
	});

	it("should not cache generated code during updateHash when fullHash is true", () => {
		const m = new TestRuntimeModule("test", 0);
		m.fullHash = true;
		expect(m._cachedGeneratedCode).toBeUndefined();

		const hash = createHash("md4");
		m.updateHash(hash, {
			chunkGraph: {
				getModuleGraphHash: () => ""
			}
		});

		expect(m._cachedGeneratedCode).toBeUndefined();
	});

	it("should not cache generated code during updateHash when dependentHash is true", () => {
		const m = new TestRuntimeModule("test", 0);
		m.dependentHash = true;
		expect(m._cachedGeneratedCode).toBeUndefined();

		const hash = createHash("md4");
		m.updateHash(hash, {
			chunkGraph: {
				getModuleGraphHash: () => ""
			}
		});

		expect(m._cachedGeneratedCode).toBeUndefined();
	});

	it("should throw when generate() throws during updateHash instead of swallowing error", () => {
		class ThrowingRuntimeModule extends RuntimeModule {
			constructor() {
				super("throwing");
			}

			generate() {
				throw new Error("failed to generate code");
			}
		}

		const m = new ThrowingRuntimeModule();
		const hash = createHash("md4");

		expect(() => {
			m.updateHash(hash, {
				chunkGraph: {
					getModuleGraphHash: () => ""
				}
			});
		}).toThrow("failed to generate code");
	});
});
