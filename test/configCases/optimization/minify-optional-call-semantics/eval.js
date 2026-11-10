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

it("should preserve an existing optional eval call", function () {
	// Older engines treat optional eval calls as direct calls.
	var expected = new Function(
		"eval",
		'var localValue = 42; return eval?.("typeof localValue");'
	)(eval);
	expect(
		(function (eval) {
			var localValue = 42;
			return eval == null ? undefined : eval?.("typeof localValue");
		})(eval)
	).toBe(expected);
});
