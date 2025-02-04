it("should allow to dynamic import a css module", done => {
	import("../pseudo-export/style.module.css").then(x => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc/****/   /* hello world *//****/   def",
					whitespace: "abc\n\tdef",
					default: "default"
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should allow to dynamic import a pure css", done => {
	import("./style.css").then(x => {
		expect(Object.keys(x).length).toBe(0)
		done();
	}, done);
});
