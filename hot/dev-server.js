/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals window __webpack_hash__ */
"use strict";

if(module.hot) {
	let lastHash;
	const upToDate = function upToDate() {
		return lastHash.indexOf(__webpack_hash__) >= 0;
	};
	const check = function check() {
		module.hot.check(true).then((updatedModules) => {
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

		}).catch((err) => {
			const status = module.hot.status();
			if(["abort", "fail"].indexOf(status) >= 0) {
				console.warn("[HMR] Cannot apply update. Need to do a full reload!");
				console.warn("[HMR] " + err.stack || err.message);
				window.location.reload();
			} else {
				console.warn("[HMR] Update failed: " + err.stack || err.message);
			}
		});
	};
	const hotEmitter = require("./emitter");
	hotEmitter.on("webpackHotUpdate", (currentHash) => {
		lastHash = currentHash;
		if(!upToDate() && module.hot.status() === "idle") {
			console.log("[HMR] Checking for updates on the server...");
			check();
		}
	});
	console.log("[HMR] Waiting for update signal from WDS...");
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
