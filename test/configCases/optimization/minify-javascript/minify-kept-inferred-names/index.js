it("should keep inferred function names when an enclosing variable has the same name", () => {
	var preserved = function () {
		return "outer";
	};
	(function () {
		var preserved = function () {
			return "inner";
		};
		expect(preserved()).toBe("inner");
		expect(preserved.name).toBe("preserved");
	})();
	expect(preserved()).toBe("outer");
	expect(preserved.name).toBe("preserved");
});

it("should keep inferred arrow function names when an enclosing variable has the same name", () => {
	var preserved = () => "outer";
	(function () {
		var preserved = () => "inner";
		expect(preserved()).toBe("inner");
		expect(preserved.name).toBe("preserved");
	})();
	expect(preserved()).toBe("outer");
	expect(preserved.name).toBe("preserved");
});

it("should keep inferred class names when an enclosing variable has the same name", () => {
	var preservedClass = class {};
	(function () {
		var preservedClass = class {};
		expect(new preservedClass()).toBeInstanceOf(preservedClass);
		expect(preservedClass.name).toBe("preservedClass");
	})();
	expect(new preservedClass()).toBeInstanceOf(preservedClass);
	expect(preservedClass.name).toBe("preservedClass");
});
