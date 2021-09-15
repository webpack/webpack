import m from "./module";

it("should add and remove chunks", done => {
	return m()
		.then(chunk => {
			expect(chunk.value).toBe(1);
			let update = 0;
			module.hot.accept("./module", () => {
				m()
					.then(chunk => {
						switch (update) {
							case 0:
								expect(chunk.value).toBe(2);
								break;
							case 1:
								expect(chunk.value).toBe(3);
								done();
								return;
						}
						update++;
						NEXT(require("../../update")(done));
					})
					.catch(done);
			});
			NEXT(require("../../update")(done));
		})
		.catch(done);
});
