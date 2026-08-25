it("should install a css chunk without leaving es5", function () {
	var loading = import(/* webpackChunkName: "lazy" */ "./lazy");
	loading.catch(function () {});
	var rels = document.head._children.map(function (child) {
		return child.rel;
	});
	expect(rels).toContain("stylesheet");
});
