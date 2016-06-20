/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals __resourceQuery */
if(module.hot) {
	var hotPollInterval = +(__resourceQuery.substr(1)) || (10 * 60 * 1000);

	function checkForUpdate(fromUpdate) {
		if(module.hot.status() === "idle") {
			module.hot.check(true).then(function(updatedModules) {
				if(!updatedModules) {
					if(fromUpdate) console.log("[HMR] Update applied.");
					return;
				}
				require("./log-apply-result")(updatedModules, updatedModules);
				checkForUpdate(true);
			}).catch(function(err) {
				var status = module.hot.status();
				if(["abort", "fail"].indexOf(status) >= 0) {
					console.warn("[HMR] Cannot apply update.");
					console.warn("[HMR] " + err.stack || err.message);
					console.warn("[HMR] You need to restart the application!");
				} else {
					console.warn("[HMR] Update failed: " + err.stack || err.message);
				}
			});
		}
	}
	setInterval(checkForUpdate, hotPollInterval);
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
