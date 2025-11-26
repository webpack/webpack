"use strict";

it("should expose only APP_ and CONFIG_ prefixed vars and built-in properties", () => {
	expect(process.env.APP_NAME).toBe("MyApp");
	expect(process.env.CONFIG_TIMEOUT).toBe("5000");

	// WEBPACK_ prefixed should not be exposed
	expect(typeof process.env.WEBPACK_API_URL).toBe("undefined");

	// Non-prefixed should not be exposed
	expect(typeof process.env.SECRET_KEY).toBe("undefined");

	expect(process.env.constructor).toBe("test");
	expect(process.env.__proto__).toBe("test");

	const { __proto__ } = process.env;
	expect(__proto__).toBe("test");

	const { constructor } = process.env;
	expect(constructor).toBe("test");
});

