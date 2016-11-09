/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals window __webpack_hash__ */
if(module.hot) {
	var lastData;
	var upToDate = function upToDate() {
		return lastData.indexOf(__webpack_hash__) >= 0;
	};
	var check = function check() {
		module.hot.check(true, function(err, updatedModules) {
			if(err) {
				if(module.hot.status() in {
						abort: 1,
						fail: 1
					}) {
					console.warn("[HMR] Cannot apply update. Need to do a full reload!");
					console.warn("[HMR] " + err.stack || err.message);
					window.location.reload();
				} else {
					console.warn("[HMR] Update failed: " + err.stack || err.message);
				}
				return;
			}

			if(!updatedModules) {
				console.warn("[HMR] Cannot find update. Need to do a full reload!");
				console.warn("[HMR] (Probably because of restarting the webpack-dev-server)");
				window.location.reload();
				return;
			}

			if(!upToDate()) {
				check();
			}

			require("./log-apply-result")(updatedModules, updatedModules);

			if(upToDate()) {
				console.log("[HMR] App is up to date.");
			}

		});
	};
	var addEventListener = window.addEventListener ? function(eventName, listener) {
		window.addEventListener(eventName, listener, false);
	} : function(eventName, listener) {
		window.attachEvent("on" + eventName, listener);
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
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
