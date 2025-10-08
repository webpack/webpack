it("should load new variable added to .env file in step 1", function () {
	expect(process.env.WEBPACK_API_URL).toBe("https://api1.example.com");
	expect(process.env.WEBPACK_FEATURE_FLAG).toBe("false");
	expect(process.env.WEBPACK_NEW_VAR).toBe("added-in-step-1");
});
