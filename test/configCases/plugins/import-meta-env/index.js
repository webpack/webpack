it("should expose NODE_ENV from mode (WebpackOptionsApply)", () => {
	const env = import.meta.env;
	expect(env.NODE_ENV).toBe("production");
});

it("should expose Vite-compatible defaults for a production node build", () => {
	expect(import.meta.env.MODE).toBe("production");
	expect(import.meta.env.DEV).toBe(false);
	expect(import.meta.env.PROD).toBe(true);
	// default target is async-node, so this is a server build
	expect(import.meta.env.SSR).toBe(true);
	expect(import.meta.env.BASE_URL).toBe("/");
});

it("should expose variables from EnvironmentPlugin", () => {
	const env = import.meta.env;
	expect(env.ENV_VAR_FROM_ENV).toBe("from_environment_plugin");
});

it("should expose variables from DotenvPlugin", () => {
	const env = import.meta.env;
	expect(env.WEBPACK_DOTENV_VAR).toBe("from_dotenv");
});

it("should keep dotenv keys literal when reading the whole env object", () => {
	const env = import.meta.env;
	expect(env["WEBPACK_DOTTED.KEY"]).toBe("from_dotted_key");
	expect(env["WEBPACK_DEEP.NESTED.KEY"]).toBe("from_deep_key");
	expect(env["WEBPACK_DASHED-KEY"]).toBe("from_dashed_key");
	expect(env["__proto__"]).toBe("from_prototype_key");
	// a dotted key must not also show up as a nested object
	expect(env.WEBPACK_DOTTED).toBe(undefined);
	expect(env.WEBPACK_DEEP).toBe(undefined);
});

it("should keep dotenv keys literal when read as a member expression", () => {
	expect(import.meta.env["WEBPACK_DOTTED.KEY"]).toBe("from_dotted_key");
	expect(process.env["WEBPACK_DOTTED.KEY"]).toBe("from_dotted_key");
	expect(process.env["WEBPACK_DASHED-KEY"]).toBe("from_dashed_key");
});

it("should expand dotenv references whose name contains null", () => {
	const env = import.meta.env;
	expect(env.WEBPACK_null_VALUE).toBe("expanded_value");
	expect(env.WEBPACK_EXPANDED_NULL).toBe("expanded_value");
});

it("should still apply the default operator after the null fix", () => {
	expect(import.meta.env.WEBPACK_EXPANDED_DEFAULT).toBe("fallback_value");
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


it("should treat import.meta.env.NOT_EXIST as falsy", () => {
	if (import.meta.env.NOT_EXIST) {
		throw new Error("import.meta.env should be falsy");
	} else {
		expect(true).toBe(true);
	}
});

it("should treat import.meta.env.NOT_EXIST as falsy", () => {
	const NOT_EXIST = import.meta.env.NOT_EXIST;
	if (NOT_EXIST) {
		throw new Error("import.meta.env should be falsy");
	} else {
		expect(true).toBe(true);
	}
});