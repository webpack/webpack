import update from "../../update.esm.js";

export {
	plain,
	named,
	left,
	right,
	looped,
	each,
	start,
	stale,
	Url,
	Shape,
	swap
} from "./forms.js";

import.meta.webpackHot.accept(["./forms.js"]);

it("should keep every form of exported binding live across a hot update", (done) => {
	import(/* webpackIgnore: true */ "./main.mjs").then((library) => {
		expect([library.plain, library.named.name, library.named()]).toEqual([
			undefined,
			"named",
			1
		]);
		expect([library.left, library.right]).toEqual(["L", "R"]);
		expect([library.looped, library.each, library.start]).toEqual([2, "b", 7]);
		library.swap();
		expect([library.plain, library.left, library.right]).toEqual([
			"set",
			"R",
			"L"
		]);
		expect(library.Shape.name).toBe("Square");
		expect(library.Url).toBe(URL);
		expect(library.stale).toBe("set");
		NEXT(
			update(done, true, () => {
				expect([library.plain, library.named.name, library.named()]).toEqual([
					"fresh",
					"named",
					2
				]);
				expect([library.left, library.right]).toEqual(["l", "r"]);
				expect([library.looped, library.each, library.start]).toEqual([
					3,
					"c",
					8
				]);
				expect(library.Shape.name).toBe("Shape");
				expect(library.stale).toBe(undefined);
				done();
			})
		);
	}, done);
});
