it("should have correct convention for css exports name", (done) => {
	Promise.all([
		import("./style.module.css?asIs"),
		import("./style.module.css?camelCase"),
		import("./style.module.css?camelCaseOnly"),
		import("./style.module.css?dashes"),
		import("./style.module.css?dashesOnly"),
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
