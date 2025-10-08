it("should access import.meta.env as object", () => {
	const env = import.meta.env;
	expect(typeof env).toBe("object");
	expect(env.MY_NODE_ENV).toBe("test");
	expect(env.API_URL).toBe("https://api.example.com");
	expect(env.API_KEY).toBe("secret123");
	expect(env.DEBUG).toBe("true");
	expect(env.MAX_RETRIES).toBe("3");
	expect(env.EMPTY_VAR).toBe("");
	expect(env.FEATURE_FLAG).toBe("false");
});

it("should access import.meta.env properties directly", () => {
	expect(import.meta.env.MY_NODE_ENV).toBe("test");
	expect(import.meta.env.API_URL).toBe("https://api.example.com");
	expect(import.meta.env.API_KEY).toBe("secret123");
	expect(import.meta.env.DEBUG).toBe("true");
	expect(import.meta.env.MAX_RETRIES).toBe("3");
	expect(import.meta.env.EMPTY_VAR).toBe("");
	expect(import.meta.env.FEATURE_FLAG).toBe("false");
});

it("should handle typeof import.meta.env", () => {
	expect(typeof import.meta.env).toBe("object");
	
	// Check that typeof returns correct type for properties
	expect(typeof import.meta.env.MY_NODE_ENV).toBe("string");
	expect(typeof import.meta.env.API_URL).toBe("string");
	expect(typeof import.meta.env.DEBUG).toBe("string");
	expect(typeof import.meta.env.MAX_RETRIES).toBe("string");
	expect(typeof import.meta.env.EMPTY_VAR).toBe("string");
});

it("should support destructuring", () => {
	const { MY_NODE_ENV, API_URL, API_KEY } = import.meta.env;
	expect(MY_NODE_ENV).toBe("test");
	expect(API_URL).toBe("https://api.example.com");
	expect(API_KEY).toBe("secret123");
});

it("should support nested destructuring", () => {
	const {
		MY_NODE_ENV: env,
		API_URL: url,
		DEBUG: debug
	} = import.meta.env;
	expect(env).toBe("test");
	expect(url).toBe("https://api.example.com");
	expect(debug).toBe("true");
});

it("should use in conditional expressions", () => {
	if (import.meta.env.MY_NODE_ENV === "test") {
		expect(true).toBe(true);
	} else {
		expect(false).toBe(true); // should not reach here
	}
	
	const isDev = import.meta.env.MY_NODE_ENV === "development";
	expect(isDev).toBe(false);
	
	const isTest = import.meta.env.MY_NODE_ENV === "test";
	expect(isTest).toBe(true);
});

it("should handle unknown properties as undefined", () => {
	expect(import.meta.env.UNKNOWN_VAR).toBeUndefined();
	expect(typeof import.meta.env.UNKNOWN_VAR).toBe("undefined");
	
	// Check that unknown properties don't break code
	const value = import.meta.env.NONEXISTENT || "default";
	expect(value).toBe("default");
});

it("should work with template literals", () => {
	const message = `API URL is ${import.meta.env.API_URL}`;
	expect(message).toBe("API URL is https://api.example.com");
	
	const debug = `Debug mode: ${import.meta.env.DEBUG}`;
	expect(debug).toBe("Debug mode: true");
});

it("should work in function parameters", () => {
	function checkEnv(env, url) {
		return env === "test" && url === "https://api.example.com";
	}
	
	const result = checkEnv(
		import.meta.env.MY_NODE_ENV,
		import.meta.env.API_URL
	);
	expect(result).toBe(true);
});

it("should work in array literals", () => {
	const envVars = [
		import.meta.env.MY_NODE_ENV,
		import.meta.env.API_URL,
		import.meta.env.DEBUG
	];
	
	expect(envVars).toEqual([
		"test",
		"https://api.example.com",
		"true"
	]);
});

it("should work in object literals", () => {
	const config = {
		env: import.meta.env.MY_NODE_ENV,
		url: import.meta.env.API_URL,
		debug: import.meta.env.DEBUG,
		retries: import.meta.env.MAX_RETRIES
	};
	
	expect(config).toEqual({
		env: "test",
		url: "https://api.example.com",
		debug: "true",
		retries: "3"
	});
});

it("should handle empty string values", () => {
	expect(import.meta.env.EMPTY_VAR).toBe("");
	expect(import.meta.env.EMPTY_VAR.length).toBe(0);
	
	// Empty string is falsy
	if (import.meta.env.EMPTY_VAR) {
		expect(false).toBe(true); // should not reach
	} else {
		expect(true).toBe(true);
	}
});

it("should work with logical operators", () => {
	const url = import.meta.env.API_URL || "fallback";
	expect(url).toBe("https://api.example.com");
	
	const unknown = import.meta.env.UNKNOWN || "default";
	expect(unknown).toBe("default");
	
	const empty = import.meta.env.EMPTY_VAR || "fallback";
	expect(empty).toBe("fallback");
});

it("should work with nullish coalescing", () => {
	const url = import.meta.env.API_URL ?? "fallback";
	expect(url).toBe("https://api.example.com");
	
	const unknown = import.meta.env.UNKNOWN ?? "default";
	expect(unknown).toBe("default");
	
	// Empty string should not be replaced with ??
	const empty = import.meta.env.EMPTY_VAR ?? "fallback";
	expect(empty).toBe("");
});

it("should be consistent with process.env", () => {
	// Both should have the same value
	expect(import.meta.env.MY_NODE_ENV).toBe(process.env.MY_NODE_ENV);
	expect(import.meta.env.API_URL).toBe(process.env.API_URL);
	expect(import.meta.env.API_KEY).toBe(process.env.API_KEY);
	expect(import.meta.env.DEBUG).toBe(process.env.DEBUG);
	expect(import.meta.env.MAX_RETRIES).toBe(process.env.MAX_RETRIES);
	expect(import.meta.env.EMPTY_VAR).toBe(process.env.EMPTY_VAR);
});

it("should work with switch statements", () => {
	let result;
	switch (import.meta.env.MY_NODE_ENV) {
		case "development":
			result = "dev";
			break;
		case "test":
			result = "test";
			break;
		case "production":
			result = "prod";
			break;
		default:
			result = "unknown";
	}
	expect(result).toBe("test");
});

it("should support method calls on string values", () => {
	const upper = import.meta.env.MY_NODE_ENV.toUpperCase();
	expect(upper).toBe("TEST");
	
	const includes = import.meta.env.API_URL.includes("example");
	expect(includes).toBe(true);
	
	const starts = import.meta.env.API_URL.startsWith("https://");
	expect(starts).toBe(true);
});

it("should work with ternary operators", () => {
	const env = import.meta.env.MY_NODE_ENV === "test" ? "testing" : "other";
	expect(env).toBe("testing");
	
	const debug = import.meta.env.DEBUG === "true" ? true : false;
	expect(debug).toBe(true);
});

it("should allow property access in computed properties", () => {
	const obj = {
		[import.meta.env.MY_NODE_ENV]: "value"
	};
	expect(obj.test).toBe("value");
	expect(obj[import.meta.env.MY_NODE_ENV]).toBe("value");
});

it("should work in return statements", () => {
	function getEnv() {
		return import.meta.env.MY_NODE_ENV;
	}
	
	function getConfig() {
		return {
			env: import.meta.env.MY_NODE_ENV,
			url: import.meta.env.API_URL
		};
	}
	
	expect(getEnv()).toBe("test");
	expect(getConfig()).toEqual({
		env: "test",
		url: "https://api.example.com"
	});
});

it("should support rest destructuring", () => {
	// Get specific keys and rest
	const { MY_NODE_ENV, API_URL, ...rest } = import.meta.env;
	
	expect(MY_NODE_ENV).toBe("test");
	expect(API_URL).toBe("https://api.example.com");
	expect(rest.API_KEY).toBe("secret123");
	expect(rest.DEBUG).toBe("true");
});

it("should handle repeated access", () => {
	// Multiple accesses should return consistent values
	const first = import.meta.env.MY_NODE_ENV;
	const second = import.meta.env.MY_NODE_ENV;
	const third = import.meta.env.MY_NODE_ENV;
	
	expect(first).toBe("test");
	expect(second).toBe("test");
	expect(third).toBe("test");
	expect(first).toBe(second);
	expect(second).toBe(third);
});

