it("should work import.meta.env with EnvironmentPlugin", () => {
    expect(import.meta.env.AAA).toBe(process.env.AAA);
});

it("should work import.meta.env with DotenvPlugin", () => {
    expect(import.meta.env.WEBPACK_API_URL).toBe(process.env.WEBPACK_API_URL);
});

it("import.meta.env behaves like process.env", async (done) => {
    try {
        const importMetaEnv = import.meta.env;
        importMetaEnv;
        const processEnv = process.env;
        processEnv;
        const UNKNOWN_PROPERTY = import.meta.env.UNKNOWN_PROPERTY;
        UNKNOWN_PROPERTY;
        const UNKNOWN_PROPERTY_2 = process.env.UNKNOWN_PROPERTY_2;
        UNKNOWN_PROPERTY_2;
        typeof import.meta.env;
        typeof process.env;
    } catch (_e) {
        // ignore
    }
    const fs = await eval("import('fs')");
    expect(fs.readFileSync(__filename, "utf-8")).toMatchSnapshot();
    done();
});