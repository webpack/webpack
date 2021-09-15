import "./modules/a";

it("should load", done => {
	Promise.all([import("./modules/b"), import("./modules/c")]).then(() => {
		done();
	});
});
