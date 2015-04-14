/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
if(module.hot) {
	var hotPollInterval = +(__resourceQuery.substr(1)) || (10*60*1000);
	function checkForUpdate(fromUpdate) {
		if(module.hot.status() === "idle") {
			module.hot.check(true, function(err, updatedModules) {
				if(err) {
					if(module.hot.status() in {abort:1,fail:1}) {
						console.warn("[HMR] Cannot apply update.");
						console.warn("[HMR] " + err.stack || err.message);
						console.warn("[HMR] You need to restart the application!");
					} else {
						console.warn("[HMR] Update failed: " + err.stack || err.message);
					}
					return;
				}
				if(!updatedModules) {
					if(fromUpdate) console.log("[HMR] Update applied.");
					return;
				}
				require("./log-apply-result")(updatedModules, updatedModules);
				checkForUpdate(true);
			});
		}
	}
	setInterval(checkForUpdate, hotPollInterval);
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
