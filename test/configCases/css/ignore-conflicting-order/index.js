it("should silence the conflicting order warning when matched by ignoreWarnings", async () => {
	await Promise.all([import("./lazy1.css"), import("./lazy2.css")]);
});
