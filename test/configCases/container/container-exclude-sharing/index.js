it("should exclude react and react-dom and fakeDep from sharing", async () => {
	await __webpack_init_sharing__("default");
	const container = __non_webpack_require__("./container.js");
	const defaultScope = __webpack_share_scopes__.default;
	container.init(defaultScope);
	const reactKeys = Object.keys(defaultScope.react);
	expect(reactKeys).not.toContain("4.0.0");
	expect(reactKeys).toContain("1.0.0");
	expect(defaultScope['react-dom']).toBeFalsy();
});
