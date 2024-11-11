it("should not have .css file", (done) => {
	__non_webpack_require__("./pseudo-export_style_module_css.bundle0.js");
	__non_webpack_require__("./pseudo-export_style_module_css_exportsOnly.bundle0.js");
	Promise.all([
		import("../pseudo-export/style.module.css"),
		import("../pseudo-export/style.module.css?module"),
		import("../pseudo-export/style.module.css?exportsOnly"),
	]).then(([style1, style2, style3]) => {
		const ns = nsObj({
			a: "a",
			abc: "a b c",
			comments: "abc/****/   /* hello world *//****/   def",
			whitespace: "abc\n\tdef",
			default: "default"
		});
		expect(style1).toEqual(ns);
		expect(style2).toEqual(ns);
		expect(style3).toEqual(ns);
	}).then(() => {
		const fs = __non_webpack_require__("fs");
		const path = __non_webpack_require__("path");
		expect(fs.existsSync(path.resolve(__dirname, "pseudo-export_style_module_css.bundle0.css"))).toBe(false);
		expect(fs.existsSync(path.resolve(__dirname, "pseudo-export_style_module_css_exportsOnly.bundle0.css"))).toBe(false);
		done()
	}).catch(e => done(e))
});
