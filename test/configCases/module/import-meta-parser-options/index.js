import disabledFields from "./disabled-fields";
import emptyOptions from "./empty-options";

const webpackVersion = parseInt(
	// eslint-disable-next-line n/no-missing-require
	require("../../../../package.json").version,
	10
);

it("should treat an empty importMeta object like preserve-unknown", () => {
	expect(emptyOptions.url).toBe(emptyOptions.sourceUrl);
	expect(emptyOptions.meta.url).toBe(emptyOptions.sourceUrl);
	expect(emptyOptions.webpack).toBe(webpackVersion);
	expect(emptyOptions.meta.webpack).toBe(webpackVersion);
	expect(emptyOptions.env.AAA).toBe(process.env.AAA);
	expect(emptyOptions.unknown).toBe("runtime");
});

it("should preserve disabled import.meta fields for runtime evaluation", () => {
	expect(disabledFields.url).not.toBe(disabledFields.sourceUrl);
	expect(disabledFields.webpack).toBeUndefined();
	expect(disabledFields.main).toBeUndefined();
	expect(disabledFields.envType).toBe("undefined");
	expect(disabledFields.contextType).toBe("undefined");
	expect(disabledFields.destructuredUrl).toBe(disabledFields.url);
	expect(disabledFields.destructuredWebpack).toBeUndefined();
	expect(disabledFields.destructuredEnvType).toBe("undefined");

	if (typeof disabledFields.filename === "string") {
		expect(disabledFields.filename).not.toBe(disabledFields.sourceFilename);
	} else {
		expect(disabledFields.filename).toBeUndefined();
	}

	if (typeof disabledFields.dirname === "string") {
		expect(disabledFields.dirname).not.toBe(disabledFields.sourceDirname);
	} else {
		expect(disabledFields.dirname).toBeUndefined();
	}
});
