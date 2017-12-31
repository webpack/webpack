/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*globals window __webpack_hash__ */
if(module.hot) {
	let lastHash;
	const upToDate = function upToDate() {
		return lastHash.indexOf(__webpack_hash__) >= 0;
	};
	const log = require("./log");
	const check = function check() {
		module.hot.check(true).then((updatedModules) => {
			if(!updatedModules) {
				log("warning", "[HMR] Cannot find update. Need to do a full reload!");
				log("warning", "[HMR] (Probably because of restarting the webpack-dev-server)");
				window.location.reload();
				return;
			}

			if(!upToDate()) {
				check();
			}

			require("./log-apply-result")(updatedModules, updatedModules);

			if(upToDate()) {
				log("info", "[HMR] App is up to date.");
			}

		}).catch((err) => {
			const status = module.hot.status();
			if(["abort", "fail"].indexOf(status) >= 0) {
				log("warning", "[HMR] Cannot apply update. Need to do a full reload!");
				log("warning", "[HMR] " + err.stack || err.message);
				window.location.reload();
			} else {
				log("warning", "[HMR] Update failed: " + err.stack || err.message);
			}
		});
	};
	const hotEmitter = require("./emitter");
	hotEmitter.on("webpackHotUpdate", (currentHash) => {
		lastHash = currentHash;
		if(!upToDate() && module.hot.status() === "idle") {
			log("info", "[HMR] Checking for updates on the server...");
			check();
		}
	});
	log("info", "[HMR] Waiting for update signal from WDS...");
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
