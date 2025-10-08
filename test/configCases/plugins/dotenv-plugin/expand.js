"use strict";

it("should expand variables by default", () => {
	expect(process.env.WEBPACK_BASE).toBe("example.com");
	expect(process.env.WEBPACK_API_URL).toBe("https://api.example.com");
	expect(process.env.WEBPACK_FULL_URL).toBe("https://api.example.com/v1");
	
	// Test default value operator
	expect(process.env.WEBPACK_PORT).toBe("3000");
});
