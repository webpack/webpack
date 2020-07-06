import "./unrelated";

it("should provide a module even when watching", () =>
	import("package").then(async ({ default: value }) => {
		await __webpack_init_sharing__("default");
		expect(value).toBe("package");
		const pkg = __webpack_share_scopes__.default.package["1.2.3"];
		expect(pkg).toBeTypeOf("object");
	}));
