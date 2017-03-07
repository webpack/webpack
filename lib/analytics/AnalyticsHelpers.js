/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @TheLarkInn
*/
"use strict";

const Insight = require("insight");
const pkg = require("../../package.json");

const reporter = new Insight({
	trackingCode: "UA-46921629-3",
	pkg
});

class AnalyticsHelpers {
	static hasPermissionToTrack() {
		if(reporter.optOut === undefined) {
			reporter.askPermission();
		}

		return !reporter.optOut;
	}

	static getReporter() {
		return reporter;
	}
}

module.exports = AnalyticsHelpers;
