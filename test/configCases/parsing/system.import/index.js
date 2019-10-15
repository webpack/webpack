it("should answer typeof System correctly", () => {
	if(__SYSTEM__) {
		expect((typeof System)).toBe("object");
	} else {
		expect((typeof System)).toBe("undefined");
	}
});

it("should answer typeof System.import correctly", () => {
	if(__SYSTEM__) {
		expect((typeof System.import)).toBe("function");
	} else {
		expect(() => {
			typeof System.import;
		}).toThrowError();
	}
});

it("should be able to use System.import()", done => {
	try {
		System.import("./module").then(mod => {
			if(__SYSTEM__) {
				expect(mod).toEqual(nsObj({
					default: "ok"
				}));
				done();
			} else {
				done(new Error("System.import should not be parsed"));
			}
		});
	} catch(e) {
		if(__SYSTEM__) {
			done(e);
		} else {
			done();
		}
	}
});
