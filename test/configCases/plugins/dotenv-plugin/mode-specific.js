"use strict";

it("should load .env.production and override .env values", () => {
	// Value from .env.production should override .env
	expect(process.env.WEBPACK_API_URL).toBe("https://prod-api.example.com");
	expect(process.env.WEBPACK_ENV).toBe("production");
	
	// Value only in .env
	expect(process.env.WEBPACK_MODE).toBe("test");
});

