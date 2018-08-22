/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class ModuleProfile {
	constructor() {
		this.startTime = Date.now();
		this.factory = 0;
		this.building = 0;
		this.additionalFactories = 0;
	}

	markFactoryEnd() {
		this.factoryTime = Date.now();
		this.factory = this.factoryTime - this.startTime;
	}

	markBuildingEnd() {
		this.buildingTime = Date.now();
		this.building = this.buildingTime - this.factoryTime;
	}

	markAdditionalFactoryEnd(realProfile) {
		const additionalFactories = Date.now() - this.startTime;
		if (additionalFactories > realProfile.additionalFactories)
			realProfile.additionalFactories = additionalFactories;
		return realProfile;
	}
}

module.exports = ModuleProfile;
