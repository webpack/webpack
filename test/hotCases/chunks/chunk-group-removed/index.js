it("should not load a sibling chunk the update removed", (done) => {
	NEXT(
		require("../../update")(done, true, () => {
			const requested = [];
			__webpack_require__.f.spy = (chunkId) => {
				requested.push(chunkId);
			};
			import(/* webpackChunkName: "page" */ "./page")
				.then((page) => {
					expect(page.default).toBe(2);
					// The handler installed at startup must not load the removed sibling.
					expect(requested).toEqual(["page"]);
					done();
				})
				.catch(done);
		})
	);
});

module.hot.accept("./page");
