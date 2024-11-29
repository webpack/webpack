it("should work", async function (done) {
	const styles = await import(/* webpackFetchPriority: "high" */ "./style.module.css");

	expect(styles).toMatchObject({
		class: "_style_module_css-class"
	});

	module.hot.accept("./style.module.css", () => {
		import("./style.module.css").then(styles => {
			expect(styles).toMatchObject({
				"class-other": "_style_module_css-class-other"
			});

			const links = window.document.getElementsByTagName('link');

			if (links.length > 0) {
				expect(links[0].getAttribute('fetchpriority')).toBe('high');
			}
			done();
		});
	});

	NEXT(require("../../update")(done));
});

module.hot.accept();
