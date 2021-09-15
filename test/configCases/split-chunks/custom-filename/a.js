import "./shared1";
import "./common1";

it("should be able to load the split chunk on demand (shared)", () => {
	return import(/* webpackChunkName: "theName" */ "./shared2");
});

it("should be able to load the split chunk on demand (common)", () => {
	return Promise.all([
		import(/* webpackChunkName: "otherName1" */ "./common2"),
		import(/* webpackChunkName: "otherName2" */ "./common3")
	]);
});
