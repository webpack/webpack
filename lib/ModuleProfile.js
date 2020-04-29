/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class ModuleProfile {
	constructor() {
		this.startTime = Date.now();
		this.factory = 0;
		this.restoring = 0;
		this.integration = 0;
		this.building = 0;
		this.storing = 0;
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

	markRestoringStart() {
		this.restoringStartTime = Date.now();
	}

	markRestoringEnd() {
		this.restoringEndTime = Date.now();
		this.restoring = this.restoringEndTime - this.restoringStartTime;
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

	markStoringStart() {
		this.storingStartTime = Date.now();
	}

	markStoringEnd() {
		this.storingEndTime = Date.now();
		this.storing = this.storingEndTime - this.storingStartTime;
	}

	// This depends on timing so we ignore it for coverage
	/* istanbul ignore next */
	/**
	 * Merge this profile into another one
	 * @param {ModuleProfile} realProfile the profile to merge into
	 * @returns {void}
	 */
	mergeInto(realProfile) {
		if (this.factory > realProfile.additionalFactories)
			realProfile.additionalFactories = this.factory;
		if (this.integration > realProfile.additionalIntegration)
			realProfile.additionalIntegration = this.integration;
	}
}

module.exports = ModuleProfile;
