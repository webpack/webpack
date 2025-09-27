"use strict";

it("should load variables with defaults", () => {
	// Main .env values should override defaults
	expect(process.env.MY_NODE_ENV).toBe("test");
	expect(process.env.PORT).toBe("3000");
	
	// Default values should be used when not in main .env
	expect(process.env.DEFAULT_VALUE).toBe("default-from-defaults");
});
