"use strict";

it("should load from custom path", () => {
	// When using .env.example as path, values should be empty (as defined in .env.example)
	expect(process.env.MY_NODE_ENV).toBe("");
	expect(process.env.API_URL).toBe("");
	expect(process.env.DEBUG).toBe("");
	expect(process.env.PORT).toBe("");
	expect(process.env.SECRET_KEY).toBe("");
	expect(process.env.REQUIRED_VAR).toBe("");
});
