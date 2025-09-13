"use strict";

it("should include system variables when systemvars is true", () => {
	// System variables should be available (we can't predict exact values, but PATH should exist)
	expect(typeof process.env.PATH).toBe("string");
	expect(process.env.PATH.length).toBeGreaterThan(0);
	
	// .env variables should also be loaded
	expect(process.env.MY_NODE_ENV).toBe("test");
	expect(process.env.API_URL).toBe("https://api.example.com");
	
	// NODE_ENV might be set by the system/test environment
	// We just check that it exists as a system variable
	expect(typeof process.env.NODE_ENV).toBe("string");
});
