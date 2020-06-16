it("should ignore case insenstive chars when generating maxSize filenames", () =>
	import(/* webpackChunkName: "chunk" */ "./chunk").then(
		({ default: value }) => {
			expect(value).toContain("a111");
			expect(value).toContain("b111");
			expect(value).toContain("A222");
			expect(value).toContain("B222");
			expect(value).toContain("cccc");
		}
	));
