import { version } from "shared";
import { version as innerVersion } from "my-module";

it("should provide both shared versions, but not the unused one", async () => {
	await __webpack_init_sharing__("default");
	expect(Object.keys(__webpack_share_scopes__.default)).toContain("shared");
	expect(Object.keys(__webpack_share_scopes__.default.shared)).toContain(
		"1.0.0"
	);
	expect(Object.keys(__webpack_share_scopes__.default.shared)).toContain(
		"2.0.0"
	);
	expect(Object.keys(__webpack_share_scopes__.default.shared)).not.toContain(
		"3.0.0"
	);
	expect(__webpack_share_scopes__.default.shared["1.0.0"].from).toEqual(
		"package-name"
	);
	expect(__webpack_share_scopes__.default.shared["2.0.0"].from).toEqual(
		"package-name"
	);
});

it("should import the correct versions", () => {
	expect(version).toBe("1.0.0");
	expect(innerVersion).toBe("2.0.0");
});
