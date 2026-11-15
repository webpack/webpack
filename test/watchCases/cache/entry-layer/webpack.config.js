"use strict";

const currentWatchStep = /** @type {{ step: string | undefined }} */ (
	require("../../../helpers/currentWatchStep")
);

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: () => ({
		main: {
			import: "./index.js",
			layer:
				currentWatchStep.step === "0"
					? "first"
					: currentWatchStep.step === "1"
						? "second"
						: undefined
		}
	})
};
