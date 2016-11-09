/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals __resourceQuery */
if(module.hot) {
	function checkForUpdate(fromUpdate) {
		module.hot.check(function(err, updatedModules) {
			if(err) {
				if(module.hot.status() in {
						abort: 1,
						fail: 1
					}) {
					console.warn("[HMR] Cannot apply update.");
					console.warn("[HMR] " + err.stack || err.message);
					console.warn("[HMR] You need to restart the application!");
				} else {
					console.warn("[HMR] Update failed: " + err.stack || err.message);
				}
				return;
			}
			if(!updatedModules) {
				if(fromUpdate)
					console.log("[HMR] Update applied.");
				else
					console.warn("[HMR] Cannot find update.");
				return;
			}

			module.hot.apply({
				ignoreUnaccepted: true
			}, function(err, renewedModules) {
				if(err) {
					if(module.hot.status() in {
							abort: 1,
							fail: 1
						}) {
						console.warn("[HMR] Cannot apply update (Need to do a full reload!)");
						console.warn("[HMR] " + err.stack || err.message);
						console.warn("[HMR] You need to restart the application!");
					} else {
						console.warn("[HMR] Update failed: " + err.stack || err.message);
					}
					return;
				}

				require("./log-apply-result")(updatedModules, renewedModules);

				checkForUpdate(true);
			});
		});
	}

	process.on(__resourceQuery.substr(1) || "SIGUSR2", function() {
		if(module.hot.status() !== "idle") {
			console.warn("[HMR] Got signal but currently in " + module.hot.status() + " state.");
			console.warn("[HMR] Need to be in idle state to start hot update.");
			return;
		}

		checkForUpdate();
	});
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
