"use strict";

it("should not load any .env files when dir is false", () => {
	// When dir: false, no .env files should be loaded
	// Only environment variables that were already set in process.env should be available
	// and only those with WEBPACK_ prefix should be exposed
	
	// These should be undefined since no .env files are loaded
	expect(typeof process.env.WEBPACK_API_URL).toBe("undefined");
	expect(typeof process.env.WEBPACK_MODE).toBe("undefined");
	expect(typeof process.env.SECRET_KEY).toBe("undefined");
	expect(typeof process.env.PRIVATE_VAR).toBe("undefined");
	
	// Only pre-existing process.env variables with WEBPACK_ prefix should be available
	// (if any were set before webpack runs)
});
