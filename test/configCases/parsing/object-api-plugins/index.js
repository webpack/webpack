it("should require through the object-form CommonJS handlers", () => {
	expect(customRequire("./a")).toBe("a");
	const flag = Math.random() < 2;
	expect(customRequire(flag ? "./a" : "./b")).toBe("a");
	expect(typeof customRequire.resolve("./b")).not.toBe("undefined");
	expect(typeof customRequire.resolve(flag ? "./a" : "./b")).not.toBe(
		"undefined"
	);
	expect(typeof customRequire.cache).toBe("object");
	expect(typeof customRequire).toBe("function");
});

it("should require through the object-form AMD handlers", (done) => {
	customAmdRequire(["./a"], (a) => {
		expect(a).toBe("a");
		customAmdRequire(["./b"], (b) => {
			expect(b).toBe("b");
			done();
		});
	});
});

it("should walk function arguments through the object-form AMD handler", () => {
	const called = typeof customFunction === "function";
	if (called) {
		customFunction(
			function (a) {
				return a;
			},
			(b) => b,
			function () {
				return this;
			}.bind({}),
			called
		);
		customRequire.resolve("./a", "./b");
	}
	expect(called).toBe(false);
});

it("should define through the object-form AMD define handler", () => {
	expect(require("./c")).toBe("ac");
});
