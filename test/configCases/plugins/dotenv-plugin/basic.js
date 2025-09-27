"use strict";

it("should load basic .env variables", () => {
	expect(process.env.MY_NODE_ENV).toBe("test");
	expect(process.env.API_URL).toBe("https://api.example.com");
	expect(process.env.DEBUG).toBe("true");
	expect(process.env.PORT).toBe("3000");
	expect(process.env.SECRET_KEY).toBe("my-secret-key");
	expect(process.env.EMPTY_VALUE).toBe("");
});