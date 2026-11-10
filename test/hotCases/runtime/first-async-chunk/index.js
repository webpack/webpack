import load from "./module";

const statuses = [];
module.hot.addStatusHandler((status) => {
	statuses.push(status);
});
module.hot.accept("./module");

it("should load and update the first async chunk an update adds", (done) => {
	load()
		.then((m) => {
			expect(m.default).toBe("none");
			NEXT(
				require("../../update")(done, true, () => {
					load()
						.then((m) => {
							expect(m.default).toBe("lazy1");
							NEXT(
								require("../../update")(done, true, () => {
									load()
										.then((m) => {
											expect(m.default).toBe("lazy2");
											// The HMR runtime kept its state: it reported both updates.
											expect(
												statuses.filter((status) => status === "apply")
											).toHaveLength(2);
											done();
										})
										.catch(done);
								})
							);
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
