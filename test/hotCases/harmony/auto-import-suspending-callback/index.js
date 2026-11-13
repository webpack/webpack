import { value } from "./file";

it("should auto-import on accept when the callback expression awaits", (done) => {
	expect(value).toBe(1);
	let evaluated = 0;
	const setup = async () => {
		module.hot.accept(
			"./file",
			(await Promise.resolve(evaluated++),
			() => {
				expect(value).toBe(2);
				expect(evaluated).toBe(1);
				done();
			})
		);
	};
	setup().then(() => {
		NEXT(require("../../update")(done));
	}, done);
});

it("should auto-import on accept when the callback expression yields", () => {
	function* setup() {
		module.hot.accept(
			"./file",
			yield () => {
				expect(value).toBe(2);
			}
		);
	}
	const generator = setup();
	const { value: callback } = generator.next();
	generator.next(callback);
});
