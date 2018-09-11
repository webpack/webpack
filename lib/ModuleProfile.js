/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class ModuleProfile {
	constructor() {
		this.startTime = Date.now();
		this.factory = 0;
		this.integration = 0;
		this.building = 0;
		this.additionalFactories = 0;
		this.additionalIntegration = 0;
	}

	markFactoryStart() {
		this.factoryStartTime = Date.now();
	}

	markFactoryEnd() {
		this.factoryEndTime = Date.now();
		this.factory = this.factoryEndTime - this.factoryStartTime;
	}

	markIntegrationStart() {
		this.integrationStartTime = Date.now();
	}

	markIntegrationEnd() {
		this.integrationEndTime = Date.now();
		this.integration = this.integrationEndTime - this.integrationStartTime;
	}

	markBuildingStart() {
		this.buildingStartTime = Date.now();
	}

	markBuildingEnd() {
		this.buildingEndTime = Date.now();
		this.building = this.buildingEndTime - this.buildingStartTime;
	}

	mergeInto(realProfile) {
		if (this.factory > realProfile.additionalFactories)
			realProfile.additionalFactories = this.factory;
		if (this.integration > realProfile.additionalIntegration)
			realProfile.additionalIntegration = this.integration;
		return realProfile;
	}
}

module.exports = ModuleProfile;
