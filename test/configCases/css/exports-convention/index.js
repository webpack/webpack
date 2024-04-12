it("should have correct convention for css exports name", (done) => {
	Promise.all([
		import("./style.module.css?as-is"),
		import("./style.module.css?camel-case"),
		import("./style.module.css?camel-case-only"),
		import("./style.module.css?dashes"),
		import("./style.module.css?dashes-only"),
		import("./style.module.css?upper"),
	]).then(([asIs, camelCase, camelCaseOnly, dashes, dashesOnly, upper]) => {
		expect(asIs).toMatchSnapshot();
		expect(camelCase).toMatchSnapshot();
		expect(camelCaseOnly).toMatchSnapshot();
		expect(dashes).toMatchSnapshot();
		expect(dashesOnly).toMatchSnapshot();
		expect(upper).toMatchSnapshot();
		done()
	}).catch(done)
});
