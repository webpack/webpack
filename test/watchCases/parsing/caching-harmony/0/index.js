import m from "./module";
import cm from "./changing-module";

it("should flag harmony modules correctly", function() {
	m.should.be.eql("module" + WATCH_STEP);
	switch(WATCH_STEP) {
		case "0":
			cm.should.be.eql("original");
			break;
		case "1":
			cm.should.be.eql("change");
			break;
	}
});
