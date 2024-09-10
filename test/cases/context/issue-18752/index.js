it("should work with importing the same file twice and destructuring", async () => {
	const type = "file";
	const { generateSummary } = await import(
		/* webpackInclude: /[/\\]folder[/\\](?!.*\.test).*\.m?js$/ */
		/* webpackChunkName: "chunk-name" */
		/* webpackMode: "lazy-once" */
		`./folder/${type}.js`
	);
	expect(typeof generateSummary).toBe("function");

	const { entityActionQueue } = await import(
		/* webpackInclude: /[/\\]folder[/\\](?!.*\.test).*\.m?js$/ */
		/* webpackChunkName: "chunk-name" */
		/* webpackMode: "lazy-once" */
		`./folder/${type}.js`
	);
	expect(typeof entityActionQueue).toBe("function");
});
