var localVar = 42;

it("should not leak localVar to other modules", () => {
	expect(localVar).toBe(42);
	import(/* webpackMode: "eager" */ "./module").then(module => {
		expect(module.default).toBe("undefined");
	});
});

export {};
