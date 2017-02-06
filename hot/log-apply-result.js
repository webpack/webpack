/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = function(updatedModules, renewedModules) {
	const unacceptedModules = updatedModules.filter((moduleId) => {
		return renewedModules && renewedModules.indexOf(moduleId) < 0;
	});

	if(unacceptedModules.length > 0) {
		console.warn("[HMR] The following modules couldn't be hot updated: (They would need a full reload!)");
		unacceptedModules.forEach((moduleId) => console.warn("[HMR]  - " + moduleId));
	}

	if(!renewedModules || renewedModules.length === 0) {
		console.log("[HMR] Nothing hot updated.");
	} else {
		console.log("[HMR] Updated modules:");
		renewedModules.forEach((moduleId) => console.log("[HMR]  - " + moduleId));
		const numberIds = renewedModules.every((moduleId) => typeof moduleId === "number");
		if(numberIds)
			console.log("[HMR] Consider using the NamedModulesPlugin for module names.");
	}
};
