it("should load externals with colliding short chunk names", () =>
	Promise.all([import("./shared"), import("../shared"), import("shared")]).then(
		([first, second, other]) => {
			expect(first.default).toBe(second.default);
			expect(typeof first.default.join).toBe("function");
			expect(typeof other.default.platform).toBe("function");
			expect(require.resolveWeak("./shared")).toBe("../shared");
		}
	));
