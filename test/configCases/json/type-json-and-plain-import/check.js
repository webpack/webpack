/**
 * @param {{ json: unknown, keys: string[] }} typed the `type: "json"` import
 * @param {{ json: unknown, a: unknown, keys: string[] }} plain the plain import
 * @param {() => Promise<{ default: unknown }>} load a dynamic `type: "json"` import
 * @returns {Promise<void>} the checks
 */
export const check = async (typed, plain, load) => {
	// as in the spec, a JSON module has only `default`
	expect(typed.json).toEqual({ a: 1 });
	expect(typed.keys).toEqual(["default"]);
	// a plain import still reads the named exports
	expect(plain.a).toBe(1);
	expect(plain.keys).toContain("a");
	// every `type: "json"` import of the file is one module
	expect((await load()).default).toBe(typed.json);
};
