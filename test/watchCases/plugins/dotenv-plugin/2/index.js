it("should override .env values with .env.development in step 2", function () {
	expect(process.env.WEBPACK_API_URL).toBe("https://api2.example.com");
	// WEBPACK_FEATURE_FLAG should be overridden by .env.development
	expect(process.env.WEBPACK_FEATURE_FLAG).toBe("true");
	expect(process.env.WEBPACK_NEW_VAR).toBe("added-in-step-1");
	// New variable from .env.development
	expect(process.env.WEBPACK_DEV_ONLY).toBe("development-value");
    // missingDependencies test
	if (WATCH_STEP === "3") {
		// In step 3, .env.myLocal from missingDependencies was created, so it has a value
		expect(process.env.WEBPACK_MY_LOCAL).toBe("3");
	} else {
		// In step 2, .env.myLocal doesn't exist yet
		expect(process.env.WEBPACK_MY_LOCAL).toBeUndefined();
	}
});
