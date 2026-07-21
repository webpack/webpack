"use strict";

// Re-bundle the emitted output through webpack (see RoundTripConfigCases): the
// analyzable `new URL("./file.png", import.meta.url)` must survive the round trip.
module.exports = {
	roundTrip: true
};
