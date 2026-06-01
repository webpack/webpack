it("should expose exports from all entry modules", function (done) {
	setTimeout(function () {
		expect(global.a).toBe("a");
		expect(global.b).toBe("b");
		expect(global.c).toBe("c");
		delete global.a;
		delete global.b;
		delete global.c;
		done();
	}, 1);
});

export const c = "c";
