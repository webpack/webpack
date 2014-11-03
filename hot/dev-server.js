if(module.hot) {
	var lastData;
	var upToDate = function upToDate() {
		return lastData.indexOf(__webpack_hash__) >= 0;
	};
	var check = function check() {
		module.hot.check(true, function(err, updatedModules) {
			if(err) {
				if(module.hot.status() in {abort:1,fail:1}) {
					console.warn("[HMR] Cannot apply update. Need to do a full reload!");
					window.location.reload();
				} else {
					console.warn("[HMR] Update failed: " + err);
				}
				return;
			}

			if(!updatedModules)
				return console.log("[HMR] No Update found.");

			if(!upToDate()) {
				check();
			}

			if(!updatedModules || updatedModules.length === 0) {
				console.log("[HMR] Update is empty.");
			} else {
				console.log("[HMR] Updated modules:");
				updatedModules.forEach(function(moduleId) {
					console.log("[HMR]  - " + moduleId);
				});
			}
			if(upToDate()) {
				console.log("[HMR] App is up to date.");
			}

		});
	};
	var addEventListener = window.addEventListener ? function(eventName, listener) {
		window.addEventListener(eventName, listener, false);
	} : function (eventName, listener) {
		window.attachEvent('on' + eventName, listener);
	};
	addEventListener("message", function(event) {
		if(typeof event.data === "string" && event.data.indexOf("webpackHotUpdate") === 0) {
			lastData = event.data;
			if(!upToDate() && module.hot.status() === "idle") {
				console.log("[HMR] Checking for updates on the server...");
				check();
			}
		}
	});
	console.log("[HMR] Waiting for update signal from WDS...");
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled");
}
