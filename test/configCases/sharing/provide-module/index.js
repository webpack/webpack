if (Math.random() < 0) {
	require("package");
}

it("should add provided modules to the share scope on init", async () => {
	expect(__webpack_share_scopes__).toEqual({});
	await __webpack_init_sharing__("default");
	expect(Object.keys(__webpack_share_scopes__)).toEqual(["default"]);
	await __webpack_init_sharing__("test-scope");
	await __webpack_init_sharing__("other-scope");
	expect(__webpack_init_sharing__("other-scope")).toBe(
		__webpack_init_sharing__("other-scope")
	);
	expect(Object.keys(__webpack_share_scopes__).length).toBe(3);
	expect(Object.keys(__webpack_share_scopes__)).toContain("default");
	expect(Object.keys(__webpack_share_scopes__)).toContain("test-scope");
	expect(Object.keys(__webpack_share_scopes__)).toContain("other-scope");
	expect(Object.keys(__webpack_share_scopes__.default)).toContain("package");
	expect(Object.keys(__webpack_share_scopes__["test-scope"])).toContain(
		"package"
	);
	expect(
		Object.keys(__webpack_share_scopes__["test-scope"]["package"])
	).toContain("1.0.0");
	expect(Object.keys(__webpack_share_scopes__["test-scope"])).toContain(
		"./test1"
	);
	expect(
		Object.keys(__webpack_share_scopes__["test-scope"]["./test1"])
	).toContain("0");
	expect(Object.keys(__webpack_share_scopes__["other-scope"])).toContain(
		"test2"
	);
	const test2Versions = Object.keys(
		__webpack_share_scopes__["other-scope"]["test2"]
	);
	expect(test2Versions).toContain("1.3.0");
	expect(test2Versions).toContain("1.1.9");
	expect(test2Versions).toContain("1.2.3");

	{
		const factory = await __webpack_share_scopes__["test-scope"]["./test1"][
			"0"
		].get();
		expect(factory()).toBe("test1");
	}

	{
		const factory = await __webpack_share_scopes__["other-scope"]["test2"][
			"1.3.0"
		].get();
		expect(factory()).toBe("test2");
	}
});
