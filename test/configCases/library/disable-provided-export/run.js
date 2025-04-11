it("should compile and run", () => {
	expect(libModule.default).toBe("module");
	expect(libModule.foo).toBe("module");
	expect(Boolean(libModule.React.version)).toBe(true);

	expect(libModernModule.default).toBe("modern-module");

	expect(libCommonjsStatic.default).toBe("commonjs-static");
});


