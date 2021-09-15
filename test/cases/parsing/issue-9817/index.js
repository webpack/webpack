import lower from "./lo";

const tests = {
	"simple template": () => import(`./langs/${lower("EN")}`),
	"double template": () => import(`./langs/${lower("E")}${lower("N")}`),
	"template with prefix": () => import(`./langs/${lower("EN")}.js`),
	"double template with prefix": () =>
		import(`./langs/${lower("E")}${lower("N")}.js`),
	"simple concat": () => import("./langs/".concat(lower("EN"))),
	"double concat": () => import("./langs/".concat(lower("E"), lower("N"))),
	"concat with prefix": () => import("./langs/".concat(lower("EN"), ".js")),
	"double concat with prefix": () =>
		import("./langs/".concat(lower("E"), lower("N"), ".js")),
	"simple plus": () => import("./langs/" + lower("EN")),
	"double plus": () => import("./langs/" + lower("E") + lower("N")),
	"plus with prefix": () => import("./langs/" + lower("EN") + ".js"),
	"double plus with prefix": () =>
		import("./langs/" + lower("E") + lower("N") + ".js")
};

for (const name of Object.keys(tests)) {
	it(`should handle imports in ${name} strings`, () => {
		return tests[name]().then(module => {
			expect(module.default).toBe("en");
		});
	});
}
