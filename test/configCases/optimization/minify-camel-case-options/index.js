it("should keep function and class names, as `keepFnames` and `keepClassnames` ask", () => {
	function namedFunction() {
		return 1;
	}
	class NamedClass {}
	expect(namedFunction()).toBe(1);
	expect(namedFunction.name).toBe("namedFunction");
	expect(NamedClass.name).toBe("NamedClass");
});

it("should write only ASCII, as `asciiOnly` asks", () => {
	const text = () => "café";
	expect(text()).toHaveLength(4);
	// A function's text is the code the minifier wrote for it.
	expect(text.toString()).not.toMatch(/[^\x00-\x7f]/);
});
