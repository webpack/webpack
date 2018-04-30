import a from "./a";
import b from "./b";
import d from "./d";
import f from "./f";
import h from "./h";
import j from "./j";

it("should fire the correct events", function(done) {
	var events = [];
	var options = {
		ignoreUnaccepted: true,
		ignoreDeclined: true,
		ignoreErrored: true,
		onDeclined: function(data) { events.push(data); },
		onUnaccepted: function(data) { events.push(data); },
		onAccepted: function(data) { events.push(data); },
		onErrored: function(data) { events.push(data); }
	};

	function waitForUpdate(fn) {
		NEXT(require("../../update")(done, options, function() {
			try {
				fn();
			} catch(e) { done(e); }
		}));
	}

	waitForUpdate(function() {
		events.should.be.eql([
			{
				type: "unaccepted",
				moduleId: "./index.js",
				chain: [ "./a.js", "./index.js" ],
			},
			{
				type: "accepted",
				moduleId: "./c.js",
				outdatedDependencies: { "./b.js": [ "./c.js" ] },
				outdatedModules: [ "./c.js" ],
			},
			{
				type: "self-declined",
				moduleId: "./d.js",
				chain: [ "./e.js", "./d.js" ],
			},
			{
				type: "declined",
				moduleId: "./g.js",
				parentId: "./f.js",
				chain: [ "./g.js", "./f.js" ],
			},
			{
				type: "accepted",
				moduleId: "./i.js",
				outdatedDependencies: { "./h.js": [ "./i.js" ] },
				outdatedModules: [ "./i.js" ],
			},
			{
				type: "accepted",
				moduleId: "./j.js",
				outdatedDependencies: {},
				outdatedModules: [ "./j.js" ],
			},
			{
				type: "accept-errored",
				moduleId: "./h.js",
				dependencyId: "./i.js",
				error: new Error("Error while loading module h")
			},
			{
				type: "self-accept-errored",
				moduleId: "./j.js",
				error: new Error("Error while loading module j")
			},
		]);
		done();
	});
});
