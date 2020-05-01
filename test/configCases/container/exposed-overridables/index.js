it("should allow to import exposed modules sync", () => {
	const { default: App } = require("./App");
	expect(App()).toBe("ButtonReactReact");
});
