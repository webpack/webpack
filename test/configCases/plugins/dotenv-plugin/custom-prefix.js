"use strict";

it("should use custom prefix", () => {
	expect(MY_ENV.MY_NODE_ENV).toBe("test");
	expect(MY_ENV.API_URL).toBe("https://api.example.com");
	expect(MY_ENV.DEBUG).toBe("true");
	expect(MY_ENV.PORT).toBe("3000");
	expect(MY_ENV.SECRET_KEY).toBe("my-secret-key");
	
	// process.env should not be defined with custom prefix
	expect(typeof process.env.MY_NODE_ENV).toBe("undefined");
});
