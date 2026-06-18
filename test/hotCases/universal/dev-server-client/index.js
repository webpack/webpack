import value from "./module";
// universal regular-HMR client: works on web (dev-server EventSource signal)
// and Node (same emitter signal) without a platform-specific client
import emitter from "../../../../hot/emitter";
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
		emitter.emit("webpackHotUpdate", stats.hash);
	});
});
