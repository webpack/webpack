const isBrowser = typeof globalThis.window !== 'undefined';

it("should work", () => {
	if (isBrowser) {
		expect(import.meta.url.endsWith("index.js")).toBe(true);
		expect(typeof import.meta.url).toBe("string");
	} else {
		// We can't handle `parser.hooks.typeof` and `parser.hooks.evaluateTypeof` for `import.meta.dirname` and `import.meta.filename`
		// because they may not exist when code is running
		expect(import.meta.dirname).toBe(__STATS__.children[__STATS_I__].outputPath);
		expect(typeof import.meta.dirname).toBe("string");
		expect(import.meta.filename.endsWith("bundle1.mjs")).toBe(true);
		expect(typeof import.meta.filename).toBe("string");
	}
});
