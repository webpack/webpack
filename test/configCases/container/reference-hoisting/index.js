it("should have the hoisted container references", () => {
	const wpm = __webpack_modules__;
	expect(wpm).toHaveProperty("webpack/container/reference/containerA");
	expect(wpm).toHaveProperty("webpack/container/reference/containerB");
});

it("should load the component from container", () => {
	return import("./App").then(({ default: App }) => {
		const rendered = App();
		expect(rendered).toBe(
			"App rendered with [This is react 0.1.2] and [ComponentA rendered with [This is react 0.1.2]]"
		);
		return import("./upgrade-react").then(({ default: upgrade }) => {
			upgrade();
			const rendered = App();
			expect(rendered).toBe(
				"App rendered with [This is react 1.2.3] and [ComponentA rendered with [This is react 1.2.3]]"
			);
		});
	});
});
