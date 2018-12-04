it("should replace a async context with a manual map", function() {
	var a = "a";
	return import(a).then(function(a) {
		expect(a).toEqual(nsObj({ default: "b" }));
	});
});
