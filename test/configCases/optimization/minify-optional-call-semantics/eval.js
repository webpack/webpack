it("should preserve direct eval behind a nullish conditional", function () {
	expect(
		(function (eval) {
			var value = 42;
			return eval == null ? undefined : eval("value");
		})(eval)
	).toBe(42);
});

it("should preserve direct eval behind a nullish statement guard", function () {
	expect(
		(function (eval) {
			var value = 42;
			eval != null && eval("value = 43");
			return value;
		})(eval)
	).toBe(43);
});

it("should preserve an already indirect optional eval", function () {
	expect(
		(function (eval) {
			var localValue = 42;
			return eval == null ? undefined : eval?.("typeof localValue");
		})(eval)
	).toBe("undefined");
});
