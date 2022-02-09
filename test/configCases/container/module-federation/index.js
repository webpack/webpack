it("should import the correct modules", () => {
	return import("./module").then(({ test }) => test());
});

it("should modulesNames returns a array with all the correct modules", () => {
	return import("./module").then(({ testModulesNames }) => testModulesNames());
});
