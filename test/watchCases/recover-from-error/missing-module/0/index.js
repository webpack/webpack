it("should recover from missing module", function() {
	switch(WATCH_STEP) {
		case "0":
			(function() {
				require("some-module");
			}).should.throw();
			break;
		case "1":
			require("some-module").should.be.eql("ok");
			break;
	}
});
