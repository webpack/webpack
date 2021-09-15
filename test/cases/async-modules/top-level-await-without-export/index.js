let value = 0;

it("should not crash when top level await is used without export", () => {
	// wait for itself
	return require.cache[module.id].exports.then(() => {
		expect(value).toBe(42);
	});
});

await new Promise(r => setTimeout(r, 100));

value = 42;

export {};
