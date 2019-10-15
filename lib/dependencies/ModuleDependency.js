/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");

class ModuleDependency extends Dependency {
	/**
	 * @param {string} request request path which needs resolving
	 */
	constructor(request) {
		super();
		this.request = request;
		this.userRequest = request;
		this.range = undefined;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `module${this.request}`;
	}

	serialize(context) {
		const { write } = context;
		write(this.request);
		write(this.userRequest);
		write(this.range);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.request = read();
		this.userRequest = read();
		this.range = read();
		super.deserialize(context);
	}
}

ModuleDependency.Template = DependencyTemplate;

module.exports = ModuleDependency;
