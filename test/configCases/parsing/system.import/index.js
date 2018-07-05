it("should answer typeof System correctly", () => {
	if(__SYSTEM__ === false) {
		expect((typeof System)).toBe("undefined");
	} else {
		expect((typeof System)).toBe("object");
	}
});

it("should answer typeof System.import correctly", () => {
	if(__SYSTEM__ === false) {
		expect(() => {
			typeof System.import;
		}).toThrowError();
	} else {
		expect((typeof System.import)).toBe("function");
	}
});

it("should be able to use System.import()", done => {
	try {
		System.import("./module").then(mod => {
			if(__SYSTEM__ === false) {
				done(new Error("System.import should not be parsed"));
			} else {
				expect(mod).toEqual({ default: "ok", [Symbol.toStringTag]: "Module" });
				done();
			}
		});
	} catch(e) {
		if(__SYSTEM__ === false) {
			done();
		} else {
			done(e);
		}
	}
});
