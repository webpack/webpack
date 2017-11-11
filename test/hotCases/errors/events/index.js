import a from "./a";
import b from "./b";
import d from "./d";
import f from "./f";
import h from "./h";
import j from "./j";
import k from "./k";
import l from "./l";

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
				outdatedDependencyChains: { "./b.js": [ "./c.js"] },
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
				outdatedDependencyChains: { "./h.js": [ "./i.js"] },
				outdatedModules: [ "./i.js" ],
			},
			{
				type: "accepted",
				moduleId: "./j.js",
				outdatedDependencies: {},
				outdatedDependencyChains: {},
				outdatedModules: [ "./j.js" ],
			},
			{
				type: "accepted",
				moduleId: "./k_valueA.js",
				outdatedDependencies: { "./k.js": [ "./k_exports.js"] },
				outdatedDependencyChains: {
					"./k.js": ["./k_exports.js"],
					"./k_exports.js": [ "./k_valueA.js" ]
				},
				outdatedModules: [ "./k_valueA.js", "./k_exports.js" ]
			},
			{
				type: "accepted",
				moduleId: "./k_valueB.js",
				outdatedDependencies: { "./k.js": [ "./k_exports.js"] },
				outdatedDependencyChains: {
					"./k.js": ["./k_exports.js"],
					"./k_exports.js": [ "./k_valueB.js" ]
				},
				outdatedModules: [ "./k_valueB.js", "./k_exports.js" ]
			},
			{
				type: "accepted",
				moduleId: "./k_valueC.js",
				outdatedDependencies: { "./k.js": [ "./k_exports.js"] },
				outdatedDependencyChains: {
					"./k.js": ["./k_exports.js"],
					"./k_exports.js": [ "./k_valueC.js" ]
				},
				outdatedModules: [ "./k_valueC.js", "./k_exports.js" ]
			},
			{
				type: "accepted",
				moduleId: "./k_valueD.js",
				outdatedDependencies: { "./k.js": [ "./k_exports.js"] },
				outdatedDependencyChains: {
					"./k.js": ["./k_exports.js"],
					"./k_exports.js": [ "./k_valueD.js" ]
				},
				outdatedModules: [ "./k_valueD.js", "./k_exports.js" ]
			},
			{
				type: "accepted",
				moduleId: "./l_valueA.js",
				outdatedDependencies: { "./l.js": [ "./l_exports.js"] },
				outdatedDependencyChains: {
					"./l.js": ["./l_exports.js"],
					"./l_exports.js": [ "./l_valueA.js", "./l_valueD.js", "./l_valueC.js" ],
					"./l_valueC.js": [ "./l_exports.js" ],
					"./l_valueD.js": [ "./l_exports.js" ]
				},
				outdatedModules: [ "./l_valueA.js", "./l_exports.js", "./l_valueC.js", "./l_valueD.js" ]
			},
			{
				type: "accepted",
				moduleId: "./l_valueC.js",
				outdatedDependencies: { "./l.js": [ "./l_exports.js"] },
				outdatedDependencyChains: {
					"./l.js": ["./l_exports.js"],
					"./l_exports.js": [ "./l_valueC.js", "./l_valueD.js" ],
					"./l_valueC.js": [ "./l_exports.js" ],
					"./l_valueD.js": [ "./l_exports.js" ]
				},
				outdatedModules: [ "./l_valueC.js", "./l_exports.js", "./l_valueD.js" ]
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
