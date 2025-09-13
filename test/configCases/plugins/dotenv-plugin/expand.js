"use strict";

it("should expand variables when expand is true", () => {
	expect(process.env.INTERPOLATED_VAR).toBe("test-mode");
	expect(process.env.MY_NODE_ENV).toBe("test");
});
