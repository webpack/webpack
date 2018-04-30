it("should answer typeof System correctly", () => {
	if(__SYSTEM__ === false) {
		(typeof System).should.be.eql("undefined");
	} else {
		(typeof System).should.be.eql("object");
	}
});

it("should answer typeof System.import correctly", () => {
	if(__SYSTEM__ === false) {
		(() => {
			typeof System.import;
		}).should.throw();
	} else {
		(typeof System.import).should.be.eql("function");
	}
});

it("should be able to use System.import()", done => {
	try {
		System.import("./module").then(mod => {
			if(__SYSTEM__ === false) {
				done(new Error("System.import should not be parsed"));
			} else {
				mod.should.be.eql({ default: "ok" });
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
