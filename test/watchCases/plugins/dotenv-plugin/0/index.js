it("should load env variables from .env file in step 0", function () {
	expect(process.env.WEBPACK_API_URL).toBe("https://api0.example.com");
	expect(process.env.WEBPACK_FEATURE_FLAG).toBe("false");
	expect(process.env.WEBPACK_NEW_VAR).toBeUndefined();
});
