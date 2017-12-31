/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals __resourceQuery */
if(module.hot) {
	const hotPollInterval = +(__resourceQuery.substr(1)) || (10 * 60 * 1000);
	const log = require("./log");

	const checkForUpdate = function checkForUpdate(fromUpdate) {
		if(module.hot.status() === "idle") {
			module.hot.check(true).then((updatedModules) => {
				if(!updatedModules) {
					if(fromUpdate) log("info", "[HMR] Update applied.");
					return;
				}
				require("./log-apply-result")(updatedModules, updatedModules);
				checkForUpdate(true);
			}).catch((err) => {
				const status = module.hot.status();
				if(["abort", "fail"].indexOf(status) >= 0) {
					log("warning", "[HMR] Cannot apply update.");
					log("warning", "[HMR] " + err.stack || err.message);
					log("warning", "[HMR] You need to restart the application!");
				} else {
					log("warning", "[HMR] Update failed: " + err.stack || err.message);
				}
			});
		}
	};
	setInterval(checkForUpdate, hotPollInterval);
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
