/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var LabeledModuleDependency = require("./LabeledModuleDependency");
var LabeledExportsDependency = require("./LabeledExportsDependency");

module.exports = AbstractPlugin.create({
	"label require": function(stmt) {
		if(stmt.body.type !== "ExpressionStatement") return;
		switch(stmt.body.expression.type) {
		case "Literal":
			var param = this.evaluateExpression(stmt.body.expression);
			return this.applyPluginsBailResult("label require:item", stmt, param);
		case "SequenceExpression":
			stmt.body.expression.expressions.forEach(function(expression) {
				var param = this.evaluateExpression(expression);
				return this.applyPluginsBailResult("label require:item", stmt, param);
			}, this);
			return true;
		}
	},
	"label require:item": function(stmt, param) {
		if(param.isString()) {
			var dep = new LabeledModuleDependency(param.string, stmt.range);
			dep.loc = stmt.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	},
	"label exports": function(stmt) {
		switch(stmt.body.type) {
		case "VariableDeclaration":
			stmt.body.declarations.forEach(function(decl) {
				if(!decl.init) return;
				var dep = new LabeledExportsDependency(decl.id.name, decl.init.range[0]);
				dep.loc = stmt.loc;
				this.state.current.addDependency(dep);
				if(!this.state.module.meta.exports) this.state.module.meta.exports = [];
				this.state.module.meta.exports.push(decl.id.name);
			}, this);
			return true;
		case "FunctionDeclaration":
			var name = stmt.body.id.name;
			var dep = new LabeledExportsDependency(name, stmt.body.range[0]);
			dep.loc = stmt.loc;
			this.state.current.addDependency(dep);
			if(!this.state.module.meta.exports) this.state.module.meta.exports = [];
			this.state.module.meta.exports.push(name);
			return true;
		case "ExpressionStatement":
			if(stmt.body.expression.type ===  "Identifier") {
				var name = stmt.body.expression.name;
				var dep = new LabeledExportsDependency(name, stmt.body.expression.range[0]);
				dep.loc = stmt.loc;
				this.state.current.addDependency(dep);
				if(!this.state.module.meta.exports) this.state.module.meta.exports = [];
				this.state.module.meta.exports.push(name);
				return true;
			} else if(stmt.body.expression.type === "SequenceExpression") {
				stmt.body.expression.expressions.forEach(function(e) {
					if(e.type !== "Identifier") return;
					var name = e.name;
					var dep = new LabeledExportsDependency(name, e.range[0]);
					dep.loc = stmt.loc;
					this.state.current.addDependency(dep);
					if(!this.state.module.meta.exports) this.state.module.meta.exports = [];
					this.state.module.meta.exports.push(name);
				}, this);
				return true;
			}
		};
	}
});

