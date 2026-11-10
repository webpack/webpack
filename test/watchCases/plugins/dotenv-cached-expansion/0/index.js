const step = require("./step");

it("should preserve escaped variables when reusing the dotenv cache", () => {
	expect(process.env.WEBPACK_DOTENV_CACHE_ESCAPED).toBe(
		"$WEBPACK_DOTENV_CACHE_BASE"
	);
});

it("should expand cached values with the current environment", () => {
	expect(process.env.WEBPACK_DOTENV_CACHE_URL).toBe(
		["first/api", "second/api", "fallback/api"][step]
	);
});

it("should restore the file value when an environment override is removed", () => {
	expect(process.env.WEBPACK_DOTENV_CACHE_BASE).toBe(
		["first", "second", "fallback"][step]
	);
});
