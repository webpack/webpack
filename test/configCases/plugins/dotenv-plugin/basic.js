"use strict";

it("should expose only WEBPACK_ prefixed env vars", () => {
	expect(process.env.WEBPACK_API_URL).toBe("https://api.example.com");
	expect(process.env.WEBPACK_MODE).toBe("test");
	
	// Non-prefixed vars should not be exposed
	expect(typeof process.env.SECRET_KEY).toBe("undefined");
	expect(typeof process.env.PRIVATE_VAR).toBe("undefined");
});
