it("should load variables from .env file via DotenvPlugin", () => {
	// Check that variables are loaded
	expect(import.meta.env.TEST_APP_NAME).toBe("MyApp");
	expect(import.meta.env.TEST_VERSION).toBe("1.2.3");
	expect(import.meta.env.TEST_ENABLE_FEATURE).toBe("true");
	expect(import.meta.env.TEST_MAX_CONNECTIONS).toBe("100");
	expect(import.meta.env.TEST_BASE_URL).toBe("https://example.com");
});

it("should have consistent values between process.env and import.meta.env", () => {
	expect(import.meta.env.TEST_APP_NAME).toBe(process.env.TEST_APP_NAME);
	expect(import.meta.env.TEST_VERSION).toBe(process.env.TEST_VERSION);
	expect(import.meta.env.TEST_ENABLE_FEATURE).toBe(process.env.TEST_ENABLE_FEATURE);
	expect(import.meta.env.TEST_MAX_CONNECTIONS).toBe(process.env.TEST_MAX_CONNECTIONS);
	expect(import.meta.env.TEST_BASE_URL).toBe(process.env.TEST_BASE_URL);
});

it("should handle .env variables in application logic", () => {
	// Simulate real application usage
	const config = {
		appName: import.meta.env.TEST_APP_NAME,
		version: import.meta.env.TEST_VERSION,
		featureEnabled: import.meta.env.TEST_ENABLE_FEATURE === "true",
		maxConnections: parseInt(import.meta.env.TEST_MAX_CONNECTIONS, 10),
		baseUrl: import.meta.env.TEST_BASE_URL
	};
	
	expect(config.appName).toBe("MyApp");
	expect(config.version).toBe("1.2.3");
	expect(config.featureEnabled).toBe(true);
	expect(config.maxConnections).toBe(100);
	expect(config.baseUrl).toBe("https://example.com");
});

it("should destructure .env variables", () => {
	const {
		TEST_APP_NAME: appName,
		TEST_VERSION: version,
		TEST_BASE_URL: baseUrl
	} = import.meta.env;
	
	expect(appName).toBe("MyApp");
	expect(version).toBe("1.2.3");
	expect(baseUrl).toBe("https://example.com");
});

