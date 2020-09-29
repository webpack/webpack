/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

class ImportContextDependency extends ContextDependency {
	constructor(options, range, valueRange) {
		super(options);

		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return `import() context ${this.options.mode}`;
	}

	get category() {
		return "esm";
	}

	serialize(context) {
		const { write } = context;

		write(this.range);
		write(this.valueRange);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.range = read();
		this.valueRange = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ImportContextDependency,
	"webpack/lib/dependencies/ImportContextDependency"
);

ImportContextDependency.Template = ContextDependencyTemplateAsRequireCall;

module.exports = ImportContextDependency;
