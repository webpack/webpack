import value from "./module";
// universal regular-HMR client: the dev-server signal is delivered through an
// `EventTarget` emitter on web and node, with no platform-specific client.
// hot/dev-server's `./emitter` is swapped to hot/emitter-event-target for
// universal targets, so push on that same singleton here.
import emitter from "../../../../hot/emitter-event-target";
import "../../../../hot/dev-server";

import.meta.webpackHot.accept("./module");

it("should trigger HMR via the dev-server signal on web and node", (done) => {
	expect(value).toBe("value-1");

	import.meta.webpackHot.accept("./module", () => {
		import("./module")
			.then((updated) => {
				expect(updated.default).toBe("value-2");
				done();
			})
			.catch(done);
	});

	NEXT((err, stats) => {
		if (err) return done(err);
		// emulate the dev-server pushing an update signal through the emitter
		emitter.dispatchEvent(
			new CustomEvent("webpackHotUpdate", {
				detail: { currentHash: stats.hash }
			})
		);
	});
});
