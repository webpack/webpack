/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @TheLarkInn
*/
"use strict";

class AnalyticsPlugin {
	constructor(reporter) {
		this.reporter = reporter;
	}

	apply(compiler) {
		compiler.plugin("compile", () => {
			this.reporter.track("compile", "start");
		});

		compiler.plugin("done", (stats) => {
			this.reporter.track("compile", "success");
			this.trackStats(stats.toJson());
		});

		compiler.plugin("failed", (error) => {
			this.reporter.track("compile", "error");
			this.trackError(error);
		});
	}

	trackStats(statsJson) {
		this.reporter.trackEvent({
			category: "success",
			action: JSON.stringify(statsJson),
			label: "stats",
			value: statsJson
		});
	}

	trackError(errorObject) {
		this.reporter.trackEvent({
			category: "error",
			action: errorObject.message,
			label: errorObject.stack,
			value: errorObject
		});
	}

}

module.exports = AnalyticsPlugin;
