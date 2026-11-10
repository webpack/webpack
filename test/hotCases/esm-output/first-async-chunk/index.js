import update from "../../update.esm";
import "./module";

// The module is in this chunk already, so its re-import loads no chunk.
const load = () => import("./module").then((m) => m.default());

const statuses = [];
import.meta.webpackHot.addStatusHandler((status) => {
	statuses.push(status);
});
import.meta.webpackHot.accept("./module");

it("should load and update the first async chunk an update adds", (done) => {
	load()
		.then((m) => {
			expect(m.default).toBe("none");
			NEXT(
				update(done, true, () => {
					load()
						.then((m) => {
							expect(m.default).toBe("lazy1");
							NEXT(
								update(done, true, () => {
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
