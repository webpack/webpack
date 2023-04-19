it("should import asset with rule.generator.publicPath", done => {
	import("./use-style.js").then(({ default: x }) => {
		try {
			const link1 = window.document.createElement("link");
			link1.rel = "stylesheet";
			link1.href = "use-style_js.bundle0.css";
			expect(link1.sheet.cssRules[0].style["background-image"]).toEqual(" url(/custom/path/to/assets/file.png)");
			expect(x.class).toEqual("./style.module.css-class");			
		} catch (e) {
			return done(e);
		}

		done();
	}, done);
});