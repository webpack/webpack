"use strict";

const createHooksRegistry = require("../lib/util/createHooksRegistry");

describe("createHooksRegistry", () => {
	/**
	 * A stand-in for a Compilation from another webpack copy: it fails the real
	 * `instanceof` but matches the constructor name check.
	 * @returns {EXPECTED_ANY} a fake compilation
	 */
	const fakeCompilation = () => {
		function Compilation() {}
		return new /** @type {EXPECTED_ANY} */ (Compilation)();
	};

	it("should create hooks once per compilation and cache them", () => {
		const create = jest.fn(() => ({ tap: () => {} }));
		const getHooks = createHooksRegistry(create);
		const compilation = fakeCompilation();
		const hooks = getHooks(compilation);
		expect(getHooks(compilation)).toBe(hooks);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("should keep hooks separate per compilation", () => {
		const getHooks = createHooksRegistry(() => ({}));
		expect(getHooks(fakeCompilation())).not.toBe(getHooks(fakeCompilation()));
	});

	it("should reject a value that is not a compilation", () => {
		const getHooks = createHooksRegistry(() => ({}));
		expect(() => getHooks(/** @type {EXPECTED_ANY} */ ({}))).toThrow(
			/must be an instance of Compilation/
		);
	});

	it("should reject a null compilation", () => {
		const getHooks = createHooksRegistry(() => ({}));
		expect(() => getHooks(/** @type {EXPECTED_ANY} */ (null))).toThrow(
			/must be an instance of Compilation/
		);
	});
});
