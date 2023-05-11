import stylesheet from './stylesheet.js';

it("should compile", () => {
	expect(stylesheet).toBe("body { background: #f00; color: #0f0; }");
});

