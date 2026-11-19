const ids = Object.keys(__webpack_modules__).sort().join(",");

global.hashedModuleIds = global.hashedModuleIds || {};
global.hashedModuleIds[NAME] = ids;

it("should hash module ids with `output.hashFunction`", () => {
	expect(require("./a")).toBe("a");
	if (NAME === "md4") {
		expect(ids).toBe(global.hashedModuleIds.default);
	}
	if (NAME === "sha256") {
		expect(ids).toBe(global.hashedModuleIds.output);
		expect(ids).not.toBe(global.hashedModuleIds.default);
	}
});
