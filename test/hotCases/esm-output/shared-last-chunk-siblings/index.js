import update from "../../update.esm";
import { loadB } from "./importer";

const hasX = () =>
	Object.keys(__webpack_modules__).some((id) => /(^|\/)x\.js$/.test(id));

it("should load only the chunks of the imported group when its last chunk ends another group", (done) => {
	loadB()
		.then((b) => {
			expect(b.default).toBe("b1");
			expect(hasX()).toBe(false);
			NEXT(
				update(done, true, () => {
					loadB()
						.then((b) => {
							expect(b.default).toBe("b2");
							expect(hasX()).toBe(false);
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
