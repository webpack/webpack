/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource, ReplaceSource } = require("webpack-sources");

// TODO: clean up this file
// replace with newer constructs

// TODO: remove DependencyVariables and replace them with something better

const extractFragmentIndex = (fragment, index) => [fragment, index];

const sortByFragmentIndex = ([a, i], [b, j]) => {
	const x = a.order - b.order;
	return x !== 0 ? x : i - j;
};

class JavascriptGenerator {
	generate(module, dependencyTemplates, runtimeTemplate) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return new RawSource("throw new Error('No source available');");
		}

		const source = new ReplaceSource(originalSource);
		const dependencyFragments = [];

		this.sourceBlock(
			module,
			module,
			[],
			dependencyTemplates,
			dependencyFragments,
			source,
			runtimeTemplate
		);

		if (dependencyFragments.length > 0) {
			const sortedFragments = dependencyFragments
				.map(extractFragmentIndex)
				.sort(sortByFragmentIndex);

			const concatSource = new ConcatSource();
			for (const [fragment] of sortedFragments) {
				concatSource.add(fragment.content);
			}

			concatSource.add(source);
			return concatSource;
		} else {
			return source;
		}
	}

	sourceBlock(
		module,
		block,
		availableVars,
		dependencyTemplates,
		dependencyFragments,
		source,
		runtimeTemplate
	) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(
				dependency,
				dependencyTemplates,
				dependencyFragments,
				source,
				runtimeTemplate
			);
		}

		/**
		 * Get the variables of all blocks that we need to inject.
		 * These will contain the variable name and its expression.
		 * The name will be added as a parameter in a IIFE the expression as its value.
		 */
		const vars = block.variables.reduce((result, value) => {
			const variable = this.sourceVariables(
				value,
				availableVars,
				dependencyTemplates,
				runtimeTemplate
			);

			if (variable) {
				result.push(variable);
			}

			return result;
		}, []);

		/**
		 * if we actually have variables
		 * this is important as how #splitVariablesInUniqueNamedChunks works
		 * it will always return an array in an array which would lead to a IIFE wrapper around
		 * a module if we do this with an empty vars array.
		 */
		if (vars.length > 0) {
			/**
			 * Split all variables up into chunks of unique names.
			 * e.g. imagine you have the following variable names that need to be injected:
			 * [foo, bar, baz, foo, some, more]
			 * we can not inject "foo" twice, therefore we just make two IIFEs like so:
			 * (function(foo, bar, baz){
			 *   (function(foo, some, more){
			 *     …
			 *   }(…));
			 * }(…));
			 *
			 * "splitVariablesInUniqueNamedChunks" splits the variables shown above up to this:
			 * [[foo, bar, baz], [foo, some, more]]
			 */
			const injectionVariableChunks = this.splitVariablesInUniqueNamedChunks(
				vars
			);

			// create all the beginnings of IIFEs
			const functionWrapperStarts = injectionVariableChunks.map(
				variableChunk => {
					return this.variableInjectionFunctionWrapperStartCode(
						variableChunk.map(variable => variable.name)
					);
				}
			);

			// and all the ends
			const functionWrapperEnds = injectionVariableChunks.map(variableChunk => {
				return this.variableInjectionFunctionWrapperEndCode(
					module,
					variableChunk.map(variable => variable.expression),
					block
				);
			});

			// join them to one big string
			const varStartCode = functionWrapperStarts.join("");

			// reverse the ends first before joining them, as the last added must be the inner most
			const varEndCode = functionWrapperEnds.reverse().join("");

			// if we have anything, add it to the source
			if (varStartCode && varEndCode) {
				const start = block.range ? block.range[0] : -10;
				const end = block.range
					? block.range[1]
					: module.originalSource().size() + 1;
				source.insert(start + 0.5, varStartCode);
				source.insert(end + 0.5, "\n/* WEBPACK VAR INJECTION */" + varEndCode);
			}
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				availableVars.concat(vars),
				dependencyTemplates,
				dependencyFragments,
				source,
				runtimeTemplate
			);
		}
	}

	sourceDependency(
		dependency,
		dependencyTemplates,
		dependencyFragments,
		source,
		runtimeTemplate
	) {
		const template = dependencyTemplates.get(dependency.constructor);
		if (!template) {
			throw new Error(
				"No template for dependency: " + dependency.constructor.name
			);
		}

		template.apply(dependency, source, runtimeTemplate, dependencyTemplates);

		if (typeof template.getInitFragments === "function") {
			const fragments = template.getInitFragments(
				dependency,
				source, // TODO remove this argument
				runtimeTemplate,
				dependencyTemplates
			);
			for (const fragment of fragments) {
				dependencyFragments.push(fragment);
			}
		}
	}

	sourceVariables(
		variable,
		availableVars,
		dependencyTemplates,
		runtimeTemplate
	) {
		const name = variable.name;
		const expr = variable.expressionSource(
			dependencyTemplates,
			runtimeTemplate
		);

		if (
			availableVars.some(
				v => v.name === name && v.expression.source() === expr.source()
			)
		) {
			return;
		}
		return {
			name: name,
			expression: expr
		};
	}

	/*
	 * creates the start part of a IIFE around the module to inject a variable name
	 * (function(…){   <- this part
	 * }.call(…))
	 */
	variableInjectionFunctionWrapperStartCode(varNames) {
		const args = varNames.join(", ");
		return `/* WEBPACK VAR INJECTION */(function(${args}) {`;
	}

	contextArgument(module, block) {
		if (this === block) {
			return module.exportsArgument;
		}
		return "this";
	}

	/*
	 * creates the end part of a IIFE around the module to inject a variable name
	 * (function(…){
	 * }.call(…))   <- this part
	 */
	variableInjectionFunctionWrapperEndCode(module, varExpressions, block) {
		const firstParam = this.contextArgument(module, block);
		const furtherParams = varExpressions.map(e => e.source()).join(", ");
		return `}.call(${firstParam}, ${furtherParams}))`;
	}

	splitVariablesInUniqueNamedChunks(vars) {
		const startState = [[]];
		return vars.reduce((chunks, variable) => {
			const current = chunks[chunks.length - 1];
			// check if variable with same name exists already
			// if so create a new chunk of variables.
			const variableNameAlreadyExists = current.some(
				v => v.name === variable.name
			);

			if (variableNameAlreadyExists) {
				// start new chunk with current variable
				chunks.push([variable]);
			} else {
				// else add it to current chunk
				current.push(variable);
			}
			return chunks;
		}, startState);
	}
}

module.exports = JavascriptGenerator;
