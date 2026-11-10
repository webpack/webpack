var fn = function(module) {
	if (typeof module !== 'number') {
		throw new Error("module should be a number");
	}
	expect((typeof module)).toBe("number");
};

it("var-hiding: should hide a free var by function argument", function() {
	fn(1);
});
