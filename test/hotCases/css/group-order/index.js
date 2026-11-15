const linkNames = () =>
	Array.from(window.document.getElementsByTagName("link"), (link) =>
		link.href.replace(/^.*\//, "").split(".")[0]
	);

it("should insert a group's stylesheets in chunk order", (done) => {
	import("./page").then((page) => {
		expect(page.default).toBe(1);
		const names = linkNames();
		expect(names.indexOf("base")).toBeGreaterThanOrEqual(0);
		expect(names.indexOf("base")).toBeLessThan(names.indexOf("page_js"));
		NEXT(
			require("../../update")(done, true, () => {
				import("./page").then((updated) => {
					expect(updated.default).toBe(2);
					done();
				}).catch(done);
			})
		);
	}).catch(done);
});

it("should keep another importer of the shared stylesheet", () =>
	import("./other").then((other) => {
		expect(other.default).toBe(1);
	}));

module.hot.accept("./page");
