import update from "../../update.esm.js";

// accepted before the only, dynamic, import of the file
import.meta.webpackHot.accept(["./data.json"]);

const load = () => import("./data.json", { with: { type: "json" } });

it("should accept a JSON module imported only with import() and type json", (done) => {
	load()
		.then(({ default: data }) => {
			expect(data.value).toBe("attr-1");
			NEXT(
				update(done, true, () => {
					load()
						.then((updated) => {
							expect(updated.default.value).toBe("attr-2");
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
