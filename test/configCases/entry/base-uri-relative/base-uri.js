// `__webpack_base_uri__` reads `.b` with no asset url involved, so chunk loading being
// off leaves `BaseUriRuntimeModule` as the only thing that names the base.
it("should read a relative baseUri against the module url", () => {
	expect(__webpack_base_uri__).toContain(__EXPECT__);
});
