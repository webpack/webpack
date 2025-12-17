"use strict";

it("should reject URLs with userinfo that bypass allowedUris", () => {
	expect(() => require("http://localhost:9990@127.0.0.1:9100/secret.js")).toThrow();
});

