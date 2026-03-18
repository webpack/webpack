import value from "./fixture.js" with { type: "text" };

it("should import .js file as text string when using with { type: 'text' }", () => {
	expect(typeof value).toBe("string");
	expect(value).toContain("invalid { javascript");
});
