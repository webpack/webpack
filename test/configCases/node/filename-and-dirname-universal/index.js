const isBrowser = typeof globalThis.document !== 'undefined';

it("should work", () => {
	if (isBrowser) {
		expect(true).toBe(true);
	} else {
		// We can't handle `parser.hooks.typeof` and `parser.hooks.evaluateTypeof` for `import.meta.dirname` and `import.meta.filename`
		// because they may not exist when code is running
		expect(import.meta.dirname).toBe(__STATS__.children[__STATS_I__].outputPath);
		expect(typeof import.meta.dirname).toBe("string");
		expect(/bundle[13].mjs/.test(import.meta.filename)).toBe(true);
		expect(typeof import.meta.filename).toBe("string");
	}
});
