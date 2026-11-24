it("should apply an update after undoing a rebuild that changed no code", done => {
	expect(require("./data.json").value).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			NEXT(
				require("../../update")(done, true, () => {
					NEXT(
						require("../../update")(done, true, () => {
							expect(require("./data.json").value).toBe(2);
							done();
						})
					);
				})
			);
		})
	);
});

module.hot.accept("./data.json");
