const fs = __non_webpack_require__("fs");

it("should import import.meta.env with EnvironmentPlugin", () => {
	expect(import.meta.env.AAA).toBe(process.env.AAA);
});

it("should import import.meta.env with DotenvPlugin", () => {
	expect(import.meta.env.WEBPACK_API_URL).toBe(process.env.WEBPACK_API_URL);
});

it("import.meta.env behaves like process.env", () => {
	const importMetaEnv = import.meta.env;
    importMetaEnv;
    const processEnv = process.env;
    processEnv;
    const UNKNOWN_PROPERTY = import.meta.env.UNKNOWN_PROPERTY;
    UNKNOWN_PROPERTY;
    const UNKNOWN_PROPERTY_2 = process.env.UNKNOWN_PROPERTY_2;
    UNKNOWN_PROPERTY_2;
    expect(0).toBe(0);
    typeof import.meta.env;
    typeof process.env;
    expect(0).toBe(0);
    // expect(fs.readFileSync(__filename, "utf-8")).toMatchSnapshot();
});