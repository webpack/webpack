/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const acorn = require("acorn-dynamic-import").default;
const Tapable = require("tapable");
const json5 = require("json5");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function joinRanges(startRange, endRange) {
	if(!endRange) return startRange;
	if(!startRange) return endRange;
	return [startRange[0], endRange[1]];
}

const POSSIBLE_AST_OPTIONS = [{
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "module",
	plugins: {
		dynamicImport: true
	}
}, {
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "script",
	plugins: {
		dynamicImport: true
	}
}];

class Parser extends Tapable {
	constructor(options) {
		super();
		this.options = options;
		this.scope = undefined;
		this.state = undefined;
		this.comments = undefined;
		this.initializeEvaluating();
	}

	initializeEvaluating() {
		this.plugin("evaluate Literal", expr => {
			switch(typeof expr.value) {
				case "number":
					return new BasicEvaluatedExpression().setNumber(expr.value).setRange(expr.range);
				case "string":
					return new BasicEvaluatedExpression().setString(expr.value).setRange(expr.range);
				case "boolean":
					return new BasicEvaluatedExpression().setBoolean(expr.value).setRange(expr.range);
			}
			if(expr.value === null)
				return new BasicEvaluatedExpression().setNull().setRange(expr.range);
			if(expr.value instanceof RegExp)
				return new BasicEvaluatedExpression().setRegExp(expr.value).setRange(expr.range);
		});
		this.plugin("evaluate LogicalExpression", function(expr) {
			let left;
			let leftAsBool;
			let right;
			if(expr.operator === "&&") {
				left = this.evaluateExpression(expr.left);
				leftAsBool = left && left.asBool();
				if(leftAsBool === false) return left.setRange(expr.range);
				if(leftAsBool !== true) return;
				right = this.evaluateExpression(expr.right);
				return right.setRange(expr.range);
			} else if(expr.operator === "||") {
				left = this.evaluateExpression(expr.left);
				leftAsBool = left && left.asBool();
				if(leftAsBool === true) return left.setRange(expr.range);
				if(leftAsBool !== false) return;
				right = this.evaluateExpression(expr.right);
				return right.setRange(expr.range);
			}
		});
		this.plugin("evaluate BinaryExpression", function(expr) {
			let left;
			let right;
			let res;
			if(expr.operator === "+") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				res = new BasicEvaluatedExpression();
				if(left.isString()) {
					if(right.isString()) {
						res.setString(left.string + right.string);
					} else if(right.isNumber()) {
						res.setString(left.string + right.number);
					} else if(right.isWrapped() && right.prefix && right.prefix.isString()) {
						res.setWrapped(
							new BasicEvaluatedExpression()
							.setString(left.string + right.prefix.string)
							.setRange(joinRanges(left.range, right.prefix.range)),
							right.postfix);
					} else if(right.isWrapped()) {
						res.setWrapped(
							new BasicEvaluatedExpression()
							.setString(left.string)
							.setRange(left.range),
							right.postfix);
					} else {
						res.setWrapped(left, null);
					}
				} else if(left.isNumber()) {
					if(right.isString()) {
						res.setString(left.number + right.string);
					} else if(right.isNumber()) {
						res.setNumber(left.number + right.number);
					}
				} else if(left.isWrapped()) {
					if(left.postfix && left.postfix.isString() && right.isString()) {
						res.setWrapped(left.prefix,
							new BasicEvaluatedExpression()
							.setString(left.postfix.string + right.string)
							.setRange(joinRanges(left.postfix.range, right.range))
						);
					} else if(left.postfix && left.postfix.isString() && right.isNumber()) {
						res.setWrapped(left.prefix,
							new BasicEvaluatedExpression()
							.setString(left.postfix.string + right.number)
							.setRange(joinRanges(left.postfix.range, right.range))
						);
					} else if(right.isString()) {
						res.setWrapped(left.prefix, right);
					} else if(right.isNumber()) {
						res.setWrapped(left.prefix,
							new BasicEvaluatedExpression()
							.setString(right.number + "")
							.setRange(right.range));
					} else {
						res.setWrapped(left.prefix, new BasicEvaluatedExpression());
					}
				} else {
					if(right.isString()) {
						res.setWrapped(null, right);
					}
				}
				res.setRange(expr.range);
				return res;
			} else if(expr.operator === "-") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				if(!left.isNumber() || !right.isNumber()) return;
				res = new BasicEvaluatedExpression();
				res.setNumber(left.number - right.number);
				res.setRange(expr.range);
				return res;
			} else if(expr.operator === "*") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				if(!left.isNumber() || !right.isNumber()) return;
				res = new BasicEvaluatedExpression();
				res.setNumber(left.number * right.number);
				res.setRange(expr.range);
				return res;
			} else if(expr.operator === "/") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				if(!left.isNumber() || !right.isNumber()) return;
				res = new BasicEvaluatedExpression();
				res.setNumber(left.number / right.number);
				res.setRange(expr.range);
				return res;
			} else if(expr.operator === "==" || expr.operator === "===") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				res = new BasicEvaluatedExpression();
				res.setRange(expr.range);
				if(left.isString() && right.isString()) {
					return res.setBoolean(left.string === right.string);
				} else if(left.isNumber() && right.isNumber()) {
					return res.setBoolean(left.number === right.number);
				} else if(left.isBoolean() && right.isBoolean()) {
					return res.setBoolean(left.bool === right.bool);
				}
			} else if(expr.operator === "!=" || expr.operator === "!==") {
				left = this.evaluateExpression(expr.left);
				right = this.evaluateExpression(expr.right);
				if(!left || !right) return;
				res = new BasicEvaluatedExpression();
				res.setRange(expr.range);
				if(left.isString() && right.isString()) {
					return res.setBoolean(left.string !== right.string);
				} else if(left.isNumber() && right.isNumber()) {
					return res.setBoolean(left.number !== right.number);
				} else if(left.isBoolean() && right.isBoolean()) {
					return res.setBoolean(left.bool !== right.bool);
				}
			}
		});
		this.plugin("evaluate UnaryExpression", function(expr) {
			if(expr.operator === "typeof") {
				let res;
				let name;
				if(expr.argument.type === "Identifier") {
					name = this.scope.renames["$" + expr.argument.name] || expr.argument.name;
					if(this.scope.definitions.indexOf(name) === -1) {
						res = this.applyPluginsBailResult1("evaluate typeof " + name, expr);
						if(res !== undefined) return res;
					}
				}
				if(expr.argument.type === "MemberExpression") {
					let expression = expr.argument;
					let exprName = [];
					while(expression.type === "MemberExpression" && !expression.computed) {
						exprName.unshift(this.scope.renames["$" + expression.property.name] || expression.property.name);
						expression = expression.object;
					}
					if(expression.type === "Identifier") {
						exprName.unshift(this.scope.renames["$" + expression.name] || expression.name);
						if(this.scope.definitions.indexOf(name) === -1) {
							exprName = exprName.join(".");
							res = this.applyPluginsBailResult1("evaluate typeof " + exprName, expr);
							if(res !== undefined) return res;
						}
					}
				}
				if(expr.argument.type === "FunctionExpression") {
					return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
				}
				const arg = this.evaluateExpression(expr.argument);
				if(arg.isString() || arg.isWrapped()) return new BasicEvaluatedExpression().setString("string").setRange(expr.range);
				else if(arg.isNumber()) return new BasicEvaluatedExpression().setString("number").setRange(expr.range);
				else if(arg.isBoolean()) return new BasicEvaluatedExpression().setString("boolean").setRange(expr.range);
				else if(arg.isArray() || arg.isConstArray() || arg.isRegExp()) return new BasicEvaluatedExpression().setString("object").setRange(expr.range);
			} else if(expr.operator === "!") {
				const argument = this.evaluateExpression(expr.argument);
				if(!argument) return;
				if(argument.isBoolean()) {
					return new BasicEvaluatedExpression().setBoolean(!argument.bool).setRange(expr.range);
				} else if(argument.isString()) {
					return new BasicEvaluatedExpression().setBoolean(!argument.string).setRange(expr.range);
				} else if(argument.isNumber()) {
					return new BasicEvaluatedExpression().setBoolean(!argument.number).setRange(expr.range);
				}
			}
		});
		this.plugin("evaluate typeof undefined", function(expr) {
			return new BasicEvaluatedExpression().setString("undefined").setRange(expr.range);
		});
		this.plugin("evaluate Identifier", function(expr) {
			const name = this.scope.renames["$" + expr.name] || expr.name;
			if(this.scope.definitions.indexOf(expr.name) === -1) {
				const result = this.applyPluginsBailResult1("evaluate Identifier " + name, expr);
				if(result) return result;
				return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
			} else {
				return this.applyPluginsBailResult1("evaluate defined Identifier " + name, expr);
			}
		});
		this.plugin("evaluate MemberExpression", function(expression) {
			let expr = expression;
			let exprName = [];
			while(expr.type === "MemberExpression" && expr.property.type === (expr.computed ? "Literal" : "Identifier")) {
				exprName.unshift(expr.property.name || expr.property.value);
				expr = expr.object;
			}
			if(expr.type === "Identifier") {
				const name = this.scope.renames["$" + expr.name] || expr.name;
				if(this.scope.definitions.indexOf(name) === -1) {
					exprName.unshift(name);
					exprName = exprName.join(".");
					if(this.scope.definitions.indexOf(expr.name) === -1) {
						const result = this.applyPluginsBailResult1("evaluate Identifier " + exprName, expression);
						if(result) return result;
						return new BasicEvaluatedExpression().setIdentifier(exprName).setRange(expression.range);
					} else {
						return this.applyPluginsBailResult1("evaluate defined Identifier " + exprName, expression);
					}
				}
			}
		});
		this.plugin("evaluate CallExpression", function(expr) {
			if(expr.callee.type !== "MemberExpression") return;
			if(expr.callee.property.type !== (expr.callee.computed ? "Literal" : "Identifier")) return;
			const param = this.evaluateExpression(expr.callee.object);
			if(!param) return;
			const property = expr.callee.property.name || expr.callee.property.value;
			return this.applyPluginsBailResult("evaluate CallExpression ." + property, expr, param);
		});
		this.plugin("evaluate CallExpression .replace", function(expr, param) {
			if(!param.isString()) return;
			if(expr.arguments.length !== 2) return;
			let arg1 = this.evaluateExpression(expr.arguments[0]);
			let arg2 = this.evaluateExpression(expr.arguments[1]);
			if(!arg1.isString() && !arg1.isRegExp()) return;
			arg1 = arg1.regExp || arg1.string;
			if(!arg2.isString()) return;
			arg2 = arg2.string;
			return new BasicEvaluatedExpression().setString(param.string.replace(arg1, arg2)).setRange(expr.range);
		});
		["substr", "substring"].forEach(fn => {
			this.plugin("evaluate CallExpression ." + fn, function(expr, param) {
				if(!param.isString()) return;
				let arg1;
				let result, str = param.string;
				switch(expr.arguments.length) {
					case 1:
						arg1 = this.evaluateExpression(expr.arguments[0]);
						if(!arg1.isNumber()) return;
						result = str[fn](arg1.number);
						break;
					case 2:
						{
							arg1 = this.evaluateExpression(expr.arguments[0]);
							const arg2 = this.evaluateExpression(expr.arguments[1]);
							if(!arg1.isNumber()) return;
							if(!arg2.isNumber()) return;
							result = str[fn](arg1.number, arg2.number);
							break;
						}
					default:
						return;
				}
				return new BasicEvaluatedExpression().setString(result).setRange(expr.range);
			});

			/**
			 * @param {string} kind "cooked" | "raw"
			 * @param {any[]} quasis quasis
			 * @param {any[]} expressions expressions
			 * @return {BasicEvaluatedExpression[]} Simplified template
			 */
			function getSimplifiedTemplateResult(kind, quasis, expressions) {
				const parts = [];

				for(let i = 0; i < quasis.length; i++) {
					parts.push(new BasicEvaluatedExpression().setString(quasis[i].value[kind]).setRange(quasis[i].range));

					if(i > 0) {
						const prevExpr = parts[parts.length - 2],
							lastExpr = parts[parts.length - 1];
						const expr = this.evaluateExpression(expressions[i - 1]);
						if(!(expr.isString() || expr.isNumber())) continue;

						prevExpr.setString(prevExpr.string + (expr.isString() ? expr.string : expr.number) + lastExpr.string);
						prevExpr.setRange([prevExpr.range[0], lastExpr.range[1]]);
						parts.pop();
					}
				}
				return parts;
			}

			this.plugin("evaluate TemplateLiteral", function(node) {
				const parts = getSimplifiedTemplateResult.call(this, "cooked", node.quasis, node.expressions);
				if(parts.length === 1) {
					return parts[0].setRange(node.range);
				}
				return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
			});
			this.plugin("evaluate TaggedTemplateExpression", function(node) {
				if(this.evaluateExpression(node.tag).identifier !== "String.raw") return;
				const parts = getSimplifiedTemplateResult.call(this, "raw", node.quasi.quasis, node.quasi.expressions);
				return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
			});
		});
		this.plugin("evaluate CallExpression .split", function(expr, param) {
			if(!param.isString()) return;
			if(expr.arguments.length !== 1) return;
			let result;
			const arg = this.evaluateExpression(expr.arguments[0]);
			if(arg.isString()) {
				result = param.string.split(arg.string);
			} else if(arg.isRegExp()) {
				result = param.string.split(arg.regExp);
			} else return;
			return new BasicEvaluatedExpression().setArray(result).setRange(expr.range);
		});
		this.plugin("evaluate ConditionalExpression", function(expr) {
			const condition = this.evaluateExpression(expr.test);
			const conditionValue = condition.asBool();
			let res;
			if(conditionValue === undefined) {
				const consequent = this.evaluateExpression(expr.consequent);
				const alternate = this.evaluateExpression(expr.alternate);
				if(!consequent || !alternate) return;
				res = new BasicEvaluatedExpression();
				if(consequent.isConditional())
					res.setOptions(consequent.options);
				else
					res.setOptions([consequent]);
				if(alternate.isConditional())
					res.addOptions(alternate.options);
				else
					res.addOptions([alternate]);
			} else {
				res = this.evaluateExpression(conditionValue ? expr.consequent : expr.alternate);
			}
			res.setRange(expr.range);
			return res;
		});
		this.plugin("evaluate ArrayExpression", function(expr) {
			const items = expr.elements.map(function(element) {
				return element !== null && this.evaluateExpression(element);
			}, this);
			if(!items.every(Boolean)) return;
			return new BasicEvaluatedExpression().setItems(items).setRange(expr.range);
		});
	}

	getRenameIdentifier(expr) {
		const result = this.evaluateExpression(expr);
		if(!result) return;
		if(result.isIdentifier()) return result.identifier;
		return;
	}

	walkClass(classy) {
		if(classy.superClass)
			this.walkExpression(classy.superClass);
		if(classy.body && classy.body.type === "ClassBody") {
			classy.body.body.forEach(methodDefinition => {
				if(methodDefinition.type === "MethodDefinition")
					this.walkMethodDefinition(methodDefinition);
			});
		}
	}

	walkMethodDefinition(methodDefinition) {
		if(methodDefinition.computed && methodDefinition.key)
			this.walkExpression(methodDefinition.key);
		if(methodDefinition.value)
			this.walkExpression(methodDefinition.value);
	}

	// Prewalking iterates the scope for variable declarations
	prewalkStatements(statements) {
		for(let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.prewalkStatement(statement);
		}
	}

	// Walking iterates the statements and expressions and processes them
	walkStatements(statements) {
		for(let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.walkStatement(statement);
		}
	}

	prewalkStatement(statement) {
		const handler = this["prewalk" + statement.type];
		if(handler)
			handler.call(this, statement);
	}

	walkStatement(statement) {
		if(this.applyPluginsBailResult1("statement", statement) !== undefined) return;
		const handler = this["walk" + statement.type];
		if(handler)
			handler.call(this, statement);
	}

	// Real Statements
	prewalkBlockStatement(statement) {
		this.prewalkStatements(statement.body);
	}

	walkBlockStatement(statement) {
		this.walkStatements(statement.body);
	}

	walkExpressionStatement(statement) {
		this.walkExpression(statement.expression);
	}

	prewalkIfStatement(statement) {
		this.prewalkStatement(statement.consequent);
		if(statement.alternate)
			this.prewalkStatement(statement.alternate);
	}

	walkIfStatement(statement) {
		const result = this.applyPluginsBailResult1("statement if", statement);
		if(result === undefined) {
			this.walkExpression(statement.test);
			this.walkStatement(statement.consequent);
			if(statement.alternate)
				this.walkStatement(statement.alternate);
		} else {
			if(result)
				this.walkStatement(statement.consequent);
			else if(statement.alternate)
				this.walkStatement(statement.alternate);
		}
	}

	prewalkLabeledStatement(statement) {
		this.prewalkStatement(statement.body);
	}

	walkLabeledStatement(statement) {
		const result = this.applyPluginsBailResult1("label " + statement.label.name, statement);
		if(result !== true)
			this.walkStatement(statement.body);
	}

	prewalkWithStatement(statement) {
		this.prewalkStatement(statement.body);
	}

	walkWithStatement(statement) {
		this.walkExpression(statement.object);
		this.walkStatement(statement.body);
	}

	prewalkSwitchStatement(statement) {
		this.prewalkSwitchCases(statement.cases);
	}

	walkSwitchStatement(statement) {
		this.walkExpression(statement.discriminant);
		this.walkSwitchCases(statement.cases);
	}

	walkTerminatingStatement(statement) {
		if(statement.argument)
			this.walkExpression(statement.argument);
	}

	walkReturnStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	walkThrowStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	prewalkTryStatement(statement) {
		this.prewalkStatement(statement.block);
	}

	walkTryStatement(statement) {
		if(this.scope.inTry) {
			this.walkStatement(statement.block);
		} else {
			this.scope.inTry = true;
			this.walkStatement(statement.block);
			this.scope.inTry = false;
		}
		if(statement.handler)
			this.walkCatchClause(statement.handler);
		if(statement.finalizer)
			this.walkStatement(statement.finalizer);
	}

	prewalkWhileStatement(statement) {
		this.prewalkStatement(statement.body);
	}

	walkWhileStatement(statement) {
		this.walkExpression(statement.test);
		this.walkStatement(statement.body);
	}

	prewalkDoWhileStatement(statement) {
		this.prewalkStatement(statement.body);
	}

	walkDoWhileStatement(statement) {
		this.walkStatement(statement.body);
		this.walkExpression(statement.test);
	}

	prewalkForStatement(statement) {
		if(statement.init) {
			if(statement.init.type === "VariableDeclaration")
				this.prewalkStatement(statement.init);
		}
		this.prewalkStatement(statement.body);
	}

	walkForStatement(statement) {
		if(statement.init) {
			if(statement.init.type === "VariableDeclaration")
				this.walkStatement(statement.init);
			else
				this.walkExpression(statement.init);
		}
		if(statement.test)
			this.walkExpression(statement.test);
		if(statement.update)
			this.walkExpression(statement.update);
		this.walkStatement(statement.body);
	}

	prewalkForInStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.prewalkStatement(statement.left);
		this.prewalkStatement(statement.body);
	}

	walkForInStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.walkStatement(statement.left);
		else
			this.walkExpression(statement.left);
		this.walkExpression(statement.right);
		this.walkStatement(statement.body);
	}

	prewalkForOfStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.prewalkStatement(statement.left);
		this.prewalkStatement(statement.body);
	}

	walkForOfStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.walkStatement(statement.left);
		else
			this.walkExpression(statement.left);
		this.walkExpression(statement.right);
		this.walkStatement(statement.body);
	}

	// Declarations
	prewalkFunctionDeclaration(statement) {
		if(statement.id) {
			this.scope.renames["$" + statement.id.name] = undefined;
			this.scope.definitions.push(statement.id.name);
		}
	}

	walkFunctionDeclaration(statement) {
		statement.params.forEach(param => {
			this.walkPattern(param);
		});
		this.inScope(statement.params, function() {
			if(statement.body.type === "BlockStatement") {
				this.prewalkStatement(statement.body);
				this.walkStatement(statement.body);
			} else {
				this.walkExpression(statement.body);
			}
		}.bind(this));
	}

	prewalkImportDeclaration(statement) {
		const source = statement.source.value;
		this.applyPluginsBailResult("import", statement, source);
		statement.specifiers.forEach(function(specifier) {
			const name = specifier.local.name;
			this.scope.renames["$" + name] = undefined;
			this.scope.definitions.push(name);
			switch(specifier.type) {
				case "ImportDefaultSpecifier":
					this.applyPluginsBailResult("import specifier", statement, source, "default", name);
					break;
				case "ImportSpecifier":
					this.applyPluginsBailResult("import specifier", statement, source, specifier.imported.name, name);
					break;
				case "ImportNamespaceSpecifier":
					this.applyPluginsBailResult("import specifier", statement, source, null, name);
					break;
			}
		}, this);
	}

	prewalkExportNamedDeclaration(statement) {
		let source;
		if(statement.source) {
			source = statement.source.value;
			this.applyPluginsBailResult("export import", statement, source);
		} else {
			this.applyPluginsBailResult1("export", statement);
		}
		if(statement.declaration) {
			if(/Expression$/.test(statement.declaration.type)) {
				throw new Error("Doesn't occur?");
			} else {
				if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
					const pos = this.scope.definitions.length;
					this.prewalkStatement(statement.declaration);
					const newDefs = this.scope.definitions.slice(pos);
					for(let index = newDefs.length - 1; index >= 0; index--) {
						const def = newDefs[index];
						this.applyPluginsBailResult("export specifier", statement, def, def, index);
					}
				}
			}
		}
		if(statement.specifiers) {
			for(let specifierIndex = 0; specifierIndex < statement.specifiers.length; specifierIndex++) {
				const specifier = statement.specifiers[specifierIndex];
				switch(specifier.type) {
					case "ExportSpecifier":
						{
							const name = specifier.exported.name;
							if(source)
								this.applyPluginsBailResult("export import specifier", statement, source, specifier.local.name, name, specifierIndex);
							else
								this.applyPluginsBailResult("export specifier", statement, specifier.local.name, name, specifierIndex);
							break;
						}
				}
			}
		}
	}

	walkExportNamedDeclaration(statement) {
		if(statement.declaration) {
			this.walkStatement(statement.declaration);
		}
	}

	prewalkExportDefaultDeclaration(statement) {
		if(/Declaration$/.test(statement.declaration.type)) {
			const pos = this.scope.definitions.length;
			this.prewalkStatement(statement.declaration);
			const newDefs = this.scope.definitions.slice(pos);
			for(let index = 0, len = newDefs.length; index < len; index++) {
				const def = newDefs[index];
				this.applyPluginsBailResult("export specifier", statement, def, "default");
			}
		}
	}

	walkExportDefaultDeclaration(statement) {
		this.applyPluginsBailResult1("export", statement);
		if(/Declaration$/.test(statement.declaration.type)) {
			if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				this.walkStatement(statement.declaration);
			}
		} else {
			this.walkExpression(statement.declaration);
			if(!this.applyPluginsBailResult("export expression", statement, statement.declaration)) {
				this.applyPluginsBailResult("export specifier", statement, statement.declaration, "default");
			}
		}
	}

	prewalkExportAllDeclaration(statement) {
		const source = statement.source.value;
		this.applyPluginsBailResult("export import", statement, source);
		this.applyPluginsBailResult("export import specifier", statement, source, null, null, 0);
	}

	prewalkVariableDeclaration(statement) {
		if(statement.declarations)
			this.prewalkVariableDeclarators(statement.declarations);
	}

	walkVariableDeclaration(statement) {
		if(statement.declarations)
			this.walkVariableDeclarators(statement.declarations);
	}

	prewalkClassDeclaration(statement) {
		if(statement.id) {
			this.scope.renames["$" + statement.id.name] = undefined;
			this.scope.definitions.push(statement.id.name);
		}
	}

	walkClassDeclaration(statement) {
		this.walkClass(statement);
	}

	prewalkSwitchCases(switchCases) {
		for(let index = 0, len = switchCases.length; index < len; index++) {
			const switchCase = switchCases[index];
			this.prewalkStatements(switchCase.consequent);
		}
	}

	walkSwitchCases(switchCases) {
		for(let index = 0, len = switchCases.length; index < len; index++) {
			const switchCase = switchCases[index];

			if(switchCase.test) {
				this.walkExpression(switchCase.test);
			}
			this.walkStatements(switchCase.consequent);
		}
	}

	walkCatchClause(catchClause) {
		this.inScope([catchClause.param], function() {
			this.prewalkStatement(catchClause.body);
			this.walkStatement(catchClause.body);
		}.bind(this));
	}

	prewalkVariableDeclarators(declarators) {
		declarators.forEach(declarator => {
			switch(declarator.type) {
				case "VariableDeclarator":
					{
						this.enterPattern(declarator.id, (name, decl) => {
							if(!this.applyPluginsBailResult1("var-" + declarator.kind + " " + name, decl)) {
								if(!this.applyPluginsBailResult1("var " + name, decl)) {
									this.scope.renames["$" + name] = undefined;
									if(this.scope.definitions.indexOf(name) < 0)
										this.scope.definitions.push(name);
								}
							}
						});
						break;
					}
			}
		});
	}

	walkVariableDeclarators(declarators) {
		declarators.forEach(declarator => {
			switch(declarator.type) {
				case "VariableDeclarator":
					{
						const renameIdentifier = declarator.init && this.getRenameIdentifier(declarator.init);
						if(renameIdentifier && declarator.id.type === "Identifier" && this.applyPluginsBailResult1("can-rename " + renameIdentifier, declarator.init)) {
							// renaming with "var a = b;"
							if(!this.applyPluginsBailResult1("rename " + renameIdentifier, declarator.init)) {
								this.scope.renames["$" + declarator.id.name] = this.scope.renames["$" + renameIdentifier] || renameIdentifier;
								const idx = this.scope.definitions.indexOf(declarator.id.name);
								if(idx >= 0) this.scope.definitions.splice(idx, 1);
							}
						} else {
							this.walkPattern(declarator.id);
							if(declarator.init)
								this.walkExpression(declarator.init);
						}
						break;
					}
			}
		});
	}

	walkPattern(pattern) {
		if(pattern.type === "Identifier")
			return;
		if(this["walk" + pattern.type])
			this["walk" + pattern.type](pattern);
	}

	walkAssignmentPattern(pattern) {
		this.walkExpression(pattern.right);
		this.walkPattern(pattern.left);
	}

	walkObjectPattern(pattern) {
		for(let i = 0, len = pattern.properties.length; i < len; i++) {
			const prop = pattern.properties[i];
			if(prop) {
				if(prop.computed)
					this.walkExpression(prop.key);
				if(prop.value)
					this.walkPattern(prop.value);
			}
		}
	}

	walkArrayPattern(pattern) {
		for(let i = 0, len = pattern.elements.length; i < len; i++) {
			const element = pattern.elements[i];
			if(element)
				this.walkPattern(element);
		}
	}

	walkRestElement(pattern) {
		this.walkPattern(pattern.argument);
	}

	walkExpressions(expressions) {
		for(let expressionsIndex = 0, len = expressions.length; expressionsIndex < len; expressionsIndex++) {
			const expression = expressions[expressionsIndex];
			if(expression)
				this.walkExpression(expression);
		}
	}

	walkExpression(expression) {
		if(this["walk" + expression.type])
			return this["walk" + expression.type](expression);
	}

	walkAwaitExpression(expression) {
		const argument = expression.argument;
		if(this["walk" + argument.type])
			return this["walk" + argument.type](argument);
	}

	walkArrayExpression(expression) {
		if(expression.elements)
			this.walkExpressions(expression.elements);
	}

	walkSpreadElement(expression) {
		if(expression.argument)
			this.walkExpression(expression.argument);
	}

	walkObjectExpression(expression) {
		for(let propIndex = 0, len = expression.properties.length; propIndex < len; propIndex++) {
			const prop = expression.properties[propIndex];
			if(prop.computed)
				this.walkExpression(prop.key);
			if(prop.shorthand)
				this.scope.inShorthand = true;
			this.walkExpression(prop.value);
			if(prop.shorthand)
				this.scope.inShorthand = false;
		}
	}

	walkFunctionExpression(expression) {
		expression.params.forEach(param => {
			this.walkPattern(param);
		});
		this.inScope(expression.params, function() {
			if(expression.body.type === "BlockStatement") {
				this.prewalkStatement(expression.body);
				this.walkStatement(expression.body);
			} else {
				this.walkExpression(expression.body);
			}
		}.bind(this));
	}

	walkArrowFunctionExpression(expression) {
		expression.params.forEach(param => {
			this.walkPattern(param);
		});
		this.inScope(expression.params, function() {
			if(expression.body.type === "BlockStatement") {
				this.prewalkStatement(expression.body);
				this.walkStatement(expression.body);
			} else {
				this.walkExpression(expression.body);
			}
		}.bind(this));
	}

	walkSequenceExpression(expression) {
		if(expression.expressions)
			this.walkExpressions(expression.expressions);
	}

	walkUpdateExpression(expression) {
		this.walkExpression(expression.argument);
	}

	walkUnaryExpression(expression) {
		if(expression.operator === "typeof") {
			let expr = expression.argument;
			let exprName = [];
			while(expr.type === "MemberExpression" && expr.property.type === (expr.computed ? "Literal" : "Identifier")) {
				exprName.unshift(expr.property.name || expr.property.value);
				expr = expr.object;
			}
			if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
				exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
				exprName = exprName.join(".");
				const result = this.applyPluginsBailResult1("typeof " + exprName, expression);
				if(result === true)
					return;
			}
		}
		this.walkExpression(expression.argument);
	}

	walkLeftRightExpression(expression) {
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
	}

	walkBinaryExpression(expression) {
		this.walkLeftRightExpression(expression);
	}

	walkLogicalExpression(expression) {
		this.walkLeftRightExpression(expression);
	}

	walkAssignmentExpression(expression) {
		const renameIdentifier = this.getRenameIdentifier(expression.right);
		if(expression.left.type === "Identifier" && renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, expression.right)) {
			// renaming "a = b;"
			if(!this.applyPluginsBailResult1("rename " + renameIdentifier, expression.right)) {
				this.scope.renames["$" + expression.left.name] = renameIdentifier;
				const idx = this.scope.definitions.indexOf(expression.left.name);
				if(idx >= 0) this.scope.definitions.splice(idx, 1);
			}
		} else if(expression.left.type === "Identifier") {
			if(!this.applyPluginsBailResult1("assigned " + expression.left.name, expression)) {
				this.walkExpression(expression.right);
			}
			this.scope.renames["$" + expression.left.name] = undefined;
			if(!this.applyPluginsBailResult1("assign " + expression.left.name, expression)) {
				this.walkExpression(expression.left);
			}
		} else {
			this.walkExpression(expression.right);
			this.walkPattern(expression.left);
			this.enterPattern(expression.left, (name, decl) => {
				this.scope.renames["$" + name] = undefined;
			});
		}
	}

	walkConditionalExpression(expression) {
		const result = this.applyPluginsBailResult1("expression ?:", expression);
		if(result === undefined) {
			this.walkExpression(expression.test);
			this.walkExpression(expression.consequent);
			if(expression.alternate)
				this.walkExpression(expression.alternate);
		} else {
			if(result)
				this.walkExpression(expression.consequent);
			else if(expression.alternate)
				this.walkExpression(expression.alternate);
		}
	}

	walkNewExpression(expression) {
		this.walkExpression(expression.callee);
		if(expression.arguments)
			this.walkExpressions(expression.arguments);
	}

	walkYieldExpression(expression) {
		if(expression.argument)
			this.walkExpression(expression.argument);
	}

	walkTemplateLiteral(expression) {
		if(expression.expressions)
			this.walkExpressions(expression.expressions);
	}

	walkTaggedTemplateExpression(expression) {
		if(expression.tag)
			this.walkExpression(expression.tag);
		if(expression.quasi && expression.quasi.expressions)
			this.walkExpressions(expression.quasi.expressions);
	}

	walkClassExpression(expression) {
		this.walkClass(expression);
	}

	walkCallExpression(expression) {
		let result;

		function walkIIFE(functionExpression, options) {
			const params = functionExpression.params;
			const args = options.map(function(arg) {
				const renameIdentifier = this.getRenameIdentifier(arg);
				if(renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, arg)) {
					if(!this.applyPluginsBailResult1("rename " + renameIdentifier, arg))
						return renameIdentifier;
				}
				this.walkExpression(arg);
			}, this);
			this.inScope(params.filter(function(identifier, idx) {
				return !args[idx];
			}), function() {
				for(let i = 0; i < args.length; i++) {
					const param = args[i];
					if(!param) continue;
					if(!params[i] || params[i].type !== "Identifier") continue;
					this.scope.renames["$" + params[i].name] = param;
				}
				if(functionExpression.body.type === "BlockStatement") {
					this.prewalkStatement(functionExpression.body);
					this.walkStatement(functionExpression.body);
				} else
					this.walkExpression(functionExpression.body);
			}.bind(this));
		}
		if(expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "FunctionExpression" &&
			!expression.callee.computed &&
			(["call", "bind"]).indexOf(expression.callee.property.name) >= 0 &&
			expression.arguments &&
			expression.arguments.length > 1
		) {
			// (function(...) { }.call/bind(?, ...))
			walkIIFE.call(this, expression.callee.object, expression.arguments.slice(1));
			this.walkExpression(expression.arguments[0]);
		} else if(expression.callee.type === "FunctionExpression" && expression.arguments) {
			// (function(...) { }(...))
			walkIIFE.call(this, expression.callee, expression.arguments);
		} else if(expression.callee.type === "Import") {
			result = this.applyPluginsBailResult1("import-call", expression);
			if(result === true)
				return;

			if(expression.arguments)
				this.walkExpressions(expression.arguments);
		} else {

			const callee = this.evaluateExpression(expression.callee);
			if(callee.isIdentifier()) {
				result = this.applyPluginsBailResult1("call " + callee.identifier, expression);
				if(result === true)
					return;
			}

			if(expression.callee)
				this.walkExpression(expression.callee);
			if(expression.arguments)
				this.walkExpressions(expression.arguments);
		}
	}

	walkMemberExpression(expression) {
		let expr = expression;
		let exprName = [];
		while(expr.type === "MemberExpression" && expr.property.type === (expr.computed ? "Literal" : "Identifier")) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
			exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
			let result = this.applyPluginsBailResult1("expression " + exprName.join("."), expression);
			if(result === true)
				return;
			exprName[exprName.length - 1] = "*";
			result = this.applyPluginsBailResult1("expression " + exprName.join("."), expression);
			if(result === true)
				return;
		}
		this.walkExpression(expression.object);
		if(expression.computed === true)
			this.walkExpression(expression.property);
	}

	walkIdentifier(expression) {
		if(this.scope.definitions.indexOf(expression.name) === -1) {
			const result = this.applyPluginsBailResult1("expression " + (this.scope.renames["$" + expression.name] || expression.name), expression);
			if(result === true)
				return;
		}
	}

	inScope(params, fn) {
		const oldScope = this.scope;
		this.scope = {
			inTry: false,
			inShorthand: false,
			definitions: oldScope.definitions.slice(),
			renames: Object.create(oldScope.renames)
		};

		for(let paramIndex = 0, len = params.length; paramIndex < len; paramIndex++) {
			const param = params[paramIndex];

			if(typeof param !== "string") {
				this.enterPattern(param, param => {
					this.scope.renames["$" + param] = undefined;
					this.scope.definitions.push(param);
				});
			} else {
				this.scope.renames["$" + param] = undefined;
				this.scope.definitions.push(param);
			}
		}

		fn();
		this.scope = oldScope;
	}

	enterPattern(pattern, onIdent) {
		if(pattern && this["enter" + pattern.type])
			this["enter" + pattern.type](pattern, onIdent);
	}

	enterIdentifier(pattern, onIdent) {
		onIdent(pattern.name, pattern);
	}

	enterObjectPattern(pattern, onIdent) {
		for(let propIndex = 0, len = pattern.properties.length; propIndex < len; propIndex++) {
			const prop = pattern.properties[propIndex];
			this.enterPattern(prop.value, onIdent);
		}
	}

	enterArrayPattern(pattern, onIdent) {
		for(let elementIndex = 0, len = pattern.elements.length; elementIndex < len; elementIndex++) {
			const element = pattern.elements[elementIndex];
			this.enterPattern(element, onIdent);
		}
	}

	enterRestElement(pattern, onIdent) {
		this.enterPattern(pattern.argument, onIdent);
	}

	enterAssignmentPattern(pattern, onIdent) {
		this.enterPattern(pattern.left, onIdent);
	}

	evaluateExpression(expression) {
		try {
			const result = this.applyPluginsBailResult1("evaluate " + expression.type, expression);
			if(result !== undefined)
				return result;
		} catch(e) {
			console.warn(e);
			// ignore error
		}
		return new BasicEvaluatedExpression().setRange(expression.range);
	}

	parseString(expression) {
		switch(expression.type) {
			case "BinaryExpression":
				if(expression.operator === "+")
					return this.parseString(expression.left) + this.parseString(expression.right);
				break;
			case "Literal":
				return expression.value + "";
		}
		throw new Error(expression.type + " is not supported as parameter for require");
	}

	parseCalculatedString(expression) {
		switch(expression.type) {
			case "BinaryExpression":
				if(expression.operator === "+") {
					const left = this.parseCalculatedString(expression.left);
					const right = this.parseCalculatedString(expression.right);
					if(left.code) {
						return {
							range: left.range,
							value: left.value,
							code: true
						};
					} else if(right.code) {
						return {
							range: [left.range[0], right.range ? right.range[1] : left.range[1]],
							value: left.value + right.value,
							code: true
						};
					} else {
						return {
							range: [left.range[0], right.range[1]],
							value: left.value + right.value
						};
					}
				}
				break;
			case "ConditionalExpression":
				{
					const consequent = this.parseCalculatedString(expression.consequent);
					const alternate = this.parseCalculatedString(expression.alternate);
					const items = [];
					if(consequent.conditional)
						Array.prototype.push.apply(items, consequent.conditional);
					else if(!consequent.code)
						items.push(consequent);
					else break;
					if(alternate.conditional)
						Array.prototype.push.apply(items, alternate.conditional);
					else if(!alternate.code)
						items.push(alternate);
					else break;
					return {
						value: "",
						code: true,
						conditional: items
					};
				}
			case "Literal":
				return {
					range: expression.range,
					value: expression.value + ""
				};
		}
		return {
			value: "",
			code: true
		};
	}

	parseStringArray(expression) {
		if(expression.type !== "ArrayExpression") {
			return [this.parseString(expression)];
		}

		const arr = [];
		if(expression.elements)
			expression.elements.forEach(function(expr) {
				arr.push(this.parseString(expr));
			}, this);
		return arr;
	}

	parseCalculatedStringArray(expression) {
		if(expression.type !== "ArrayExpression") {
			return [this.parseCalculatedString(expression)];
		}

		const arr = [];
		if(expression.elements)
			expression.elements.forEach(function(expr) {
				arr.push(this.parseCalculatedString(expr));
			}, this);
		return arr;
	}

	parse(source, initialState) {
		let ast;
		const comments = [];
		for(let i = 0, len = POSSIBLE_AST_OPTIONS.length; i < len; i++) {
			if(!ast) {
				try {
					comments.length = 0;
					POSSIBLE_AST_OPTIONS[i].onComment = comments;
					ast = acorn.parse(source, POSSIBLE_AST_OPTIONS[i]);
				} catch(e) {
					// ignore the error
				}
			}
		}
		if(!ast) {
			// for the error
			ast = acorn.parse(source, {
				ranges: true,
				locations: true,
				ecmaVersion: 2017,
				sourceType: "module",
				plugins: {
					dynamicImport: true
				},
				onComment: comments
			});
		}
		if(!ast || typeof ast !== "object")
			throw new Error("Source couldn't be parsed");
		const oldScope = this.scope;
		const oldState = this.state;
		const oldComments = this.comments;
		this.scope = {
			inTry: false,
			definitions: [],
			renames: {}
		};
		const state = this.state = initialState || {};
		this.comments = comments;
		if(this.applyPluginsBailResult("program", ast, comments) === undefined) {
			this.prewalkStatements(ast.body);
			this.walkStatements(ast.body);
		}
		this.scope = oldScope;
		this.state = oldState;
		this.comments = oldComments;
		return state;
	}

	evaluate(source) {
		const ast = acorn.parse("(" + source + ")", {
			ranges: true,
			locations: true,
			ecmaVersion: 2017,
			sourceType: "module",
			plugins: {
				dynamicImport: true
			}
		});
		if(!ast || typeof ast !== "object" || ast.type !== "Program")
			throw new Error("evaluate: Source couldn't be parsed");
		if(ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement")
			throw new Error("evaluate: Source is not a expression");
		return this.evaluateExpression(ast.body[0].expression);
	}

	getComments(range) {
		return this.comments.filter(comment => comment.range[0] >= range[0] && comment.range[1] <= range[1]);
	}

	getCommentOptions(range) {
		const comments = this.getComments(range);
		if(comments.length === 0) return null;
		const options = comments.map(comment => {
			try {
				return json5.parse(`{${comment.value}}`);
			} catch(e) {
				return {};
			}
		});
		return options.reduce((o, i) => Object.assign(o, i), {});
	}

}

module.exports = Parser;
