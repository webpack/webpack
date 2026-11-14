import update from "../../update.esm";
import { value } from "./file";
import { value as other } from "./other";

it("should auto-import on accept when the callback expression awaits or yields", (done) => {
	expect(value).toBe(1);
	expect(other).toBe(1);
	let pending = 2;
	const finish = () => {
		if (--pending === 0) done();
	};
	let evaluated = 0;
	const setupAwait = async () => {
		import.meta.webpackHot.accept(
			"./file",
			(await Promise.resolve(evaluated++),
			() => {
				expect(value).toBe(2);
				expect(evaluated).toBe(1);
				finish();
			})
		);
	};
	function* setupYield() {
		import.meta.webpackHot.accept(
			"./other",
			yield () => {
				expect(other).toBe(2);
				finish();
			}
		);
	}
	const generator = setupYield();
	generator.next(generator.next().value);
	setupAwait().then(() => {
		NEXT(update(done));
	}, done);
});
