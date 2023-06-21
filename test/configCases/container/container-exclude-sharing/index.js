it("should exclude react@4 and react-dom from sharing", async () => {
	await __webpack_init_sharing__("default");
	const container = __non_webpack_require__("./container.js");
	const defaultScope = __webpack_share_scopes__.default;
	container.init(defaultScope);
	const reactKeys = Object.keys(defaultScope.react);
	expect(reactKeys).not.toContain("4.0.0");
	expect(reactKeys).toContain("1.0.0");
	expect(defaultScope['react-dom']).toBeFalsy();
});

it("excludes react@4 from consumption and modules still work", async () => {
	__webpack_require__.S = {
		default: {
			react: {
				"3.1.1": {
					from: "z",
					get() {
						return () => () => "providedReact";
					}
				}
			}
		}
	};
	await __webpack_init_sharing__("default");
	const mod = (await import("./module")).ok;
	expect(mod.reactModule()).toEqual("react");
	expect(mod.reactDOMModule()).toEqual("react-dom");
	expect(mod.barFoo()).toEqual("fakenested react from bar");
});