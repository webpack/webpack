it("should expose NODE_ENV from mode (WebpackOptionsApply)", () => {
	const env = import.meta.env;
	expect(env.NODE_ENV).toBe("production");
});

it("should expose variables from EnvironmentPlugin", () => {
	const env = import.meta.env;
	expect(env.ENV_VAR_FROM_ENV).toBe("from_environment_plugin");
});

it("should expose variables from DotenvPlugin", () => {
	const env = import.meta.env;
	expect(env.WEBPACK_DOTENV_VAR).toBe("from_dotenv");
});

it("should expose variables from DefinePlugin", () => {
	const env = import.meta.env;
	expect(env.CUSTOM_VAR).toBe("custom_value");
});

it("should support typeof import.meta.env", () => {
	expect(typeof import.meta.env).toBe("object");
});

it("should evaluate typeof import.meta.env as 'object'", () => {
	const typeofEnv = typeof import.meta.env;
	expect(typeofEnv).toBe("object");
});

it("should treat import.meta.env as truthy", () => {
	if (import.meta.env) {
		expect(true).toBe(true);
	} else {
		throw new Error("import.meta.env should be truthy");
	}
});



