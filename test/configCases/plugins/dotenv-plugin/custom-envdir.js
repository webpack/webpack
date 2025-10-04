"use strict";

it("should load from custom dir", () => {
	expect(process.env.WEBPACK_FROM_ENVS).toBe("loaded-from-envs-dir");
	expect(process.env.WEBPACK_API_URL).toBe("https://custom.example.com");
});

