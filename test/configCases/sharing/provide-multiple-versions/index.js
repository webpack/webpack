import "shared";
import "my-module";

it("should provide both shared versions, but not the unused one", async () => {
	await __webpack_init_sharing__("default");
	expect(Object.keys(__webpack_share_scopes__.default)).toContain("shared`1");
	expect(Object.keys(__webpack_share_scopes__.default)).toContain("shared`2");
	expect(Object.keys(__webpack_share_scopes__.default)).toContain("shared");
	expect(__webpack_share_scopes__.default.shared.version).toEqual([2, 0, 0]);
});
