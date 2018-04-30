import hh from "./hh";
import hc from "./hc";
import ch from "./ch";
import cc from "./cc";

it("should flag modules correctly", function() {
	hh.should.be.eql("hh" + WATCH_STEP);
	cc.should.be.eql("cc" + WATCH_STEP);
	hc.should.be.eql("hc" + WATCH_STEP);
	ch.should.be.eql("ch" + WATCH_STEP);
	require("./hh").default.should.be.eql("hh" + WATCH_STEP);
	require("./cc").should.be.eql("cc" + WATCH_STEP);
	switch(WATCH_STEP) {
		case "0":
			require("./hc").default.should.be.eql("hc0");
			require("./ch").should.be.eql("ch0");
			break;
		case "1":
			require("./hc").should.be.eql("hc1");
			require("./ch").default.should.be.eql("ch1");
			break;
	}
});
