it("should load fine", () => {
	return import(/* webpackChunkName: "async" */"./async");
});
