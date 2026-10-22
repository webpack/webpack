/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class ModuleProfile {
	constructor() {
		/** @type {number} */
		this.startTime = Date.now();

		/** @type {number} */
		this.factoryStartTime = 0;
		/** @type {number} */
		this.factoryEndTime = 0;
		/** @type {number} */
		this.factory = 0;
		/** @type {number} */
		this.factoryParallelismFactor = 0;

		/** @type {number} */
		this.restoringStartTime = 0;
		/** @type {number} */
		this.restoringEndTime = 0;
		/** @type {number} */
		this.restoring = 0;
		/** @type {number} */
		this.restoringParallelismFactor = 0;

		/** @type {number} */
		this.integrationStartTime = 0;
		/** @type {number} */
		this.integrationEndTime = 0;
		/** @type {number} */
		this.integration = 0;
		/** @type {number} */
		this.integrationParallelismFactor = 0;

		/** @type {number} */
		this.buildingStartTime = 0;
		/** @type {number} */
		this.buildingEndTime = 0;
		/** @type {number} */
		this.building = 0;
		/** @type {number} */
		this.buildingParallelismFactor = 0;

		/** @type {number} */
		this.storingStartTime = 0;
		/** @type {number} */
		this.storingEndTime = 0;
		/** @type {number} */
		this.storing = 0;
		/** @type {number} */
		this.storingParallelismFactor = 0;

		/** @type {{ start: number, end: number }[] | undefined} */
		this.additionalFactoryTimes = undefined;
		/** @type {number} */
		this.additionalFactories = 0;
		/** @type {number} */
		this.additionalFactoriesParallelismFactor = 0;

		/**
		 * @deprecated
		 * @type {number}
		 */
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
		realProfile.additionalFactories = this.factory;
		(realProfile.additionalFactoryTimes =
			realProfile.additionalFactoryTimes || []).push({
			start: this.factoryStartTime,
			end: this.factoryEndTime
		});
	}
}

module.exports = ModuleProfile;
