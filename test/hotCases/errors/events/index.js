import a from "./a";
import b from "./b";
import d from "./d";
import f from "./f";

it("should fire the correct events", function(done) {
	var events = [];
	var options = {
		ignoreUnaccepted: true,
		ignoreDeclined: true,
		onDeclined: function(data) { events.push(data); },
		onUnaccepted: function(data) { events.push(data); },
		onAccepted: function(data) { events.push(data); }
	};

	function waitForUpdate(fn) {
		NEXT(require("../../update")(done, options, function() {
			try {
				fn();
			} catch(e) { done(e); }
		}));
	}

	waitForUpdate(function() {
		events.sort(function(a, b) {
			if(a.type > b.type) return 1;
			if(a.type < b.type) return -1;
			return 0;
		}).should.be.eql([
			{
				outdatedDependencies: { "./b.js": [ "./c.js" ] },
				outdatedModules: [ "./c.js" ],
				type: "accepted"
			},
			{
				chain: [ "./g.js", "./f.js" ],
				moduleId: "./g.js",
				parentId: "./f.js",
				type: "declined"
			},
			{
				chain: [ "./e.js", "./d.js" ],
				moduleId: "./d.js",
				type: "self-declined"
			},
			{
				chain: [ "./a.js", "./index.js" ],
				moduleId: "./index.js",
				type: "unaccepted"
			},
		]);
		done();
	});
});
