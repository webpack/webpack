it('uses provided module for react@1 and does not use provided react-dom@2 and react@3', async () => {
	__webpack_share_scopes__.default = {
		react: {
			"1.0.2": {
				from: "z",
				get() {
					return Promise.resolve(() => () => "react-1x-provided")
				}
			},
			"3.1.1": {
				from: "z",
				get() {
					return () => () => "react-3x-provided";
				}
			}
		},
		"react-dom": {
			"4.0.1": {
				from: "z",
				get() {
					return () => () => "react-dom-provided";
				}
			}
		}
	};
	await __webpack_init_sharing__("default");
	const defaultScope = __webpack_share_scopes__.default;
	const mod = (await import("./module")).ok;
	expect(mod.reactModule()).toEqual("react-1x-provided");
	expect(mod.reactDOMModule()).toEqual("react-dom");
	expect(mod.barFoo()).toEqual("fakenested react from bar");
	const reactKeys = Object.keys(defaultScope.react);
	expect(reactKeys).not.toContain("4.0.0");
	expect(reactKeys).toContain("1.0.0");
	const reactDOMKeys = Object.keys(defaultScope["react-dom"]);
	expect(reactDOMKeys).toEqual(["4.0.1"]);
});