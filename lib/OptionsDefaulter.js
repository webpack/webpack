/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function getProperty(obj, name) {
	name = name.split(".");
	for(let i = 0; i < name.length - 1; i++) {
		obj = obj[name[i]];
		if(typeof obj !== "object" || !obj) return;
	}
	return obj[name.pop()];
}

function setProperty(obj, name, value) {
	name = name.split(".");
	for(let i = 0; i < name.length - 1; i++) {
		if(typeof obj[name[i]] !== "object" && typeof obj[name[i]] !== "undefined") return;
		if(!obj[name[i]]) obj[name[i]] = {};
		obj = obj[name[i]];
	}
	obj[name.pop()] = value;
}

class OptionsDefaulter {
	constructor() {
		this.defaults = {};
		this.config = {};
	}

	process(options) {
		// TODO: change this for webpack 4: options = Object.assign({}, options);
		for(let name in this.defaults) {
			switch(this.config[name]) {
				case undefined:
					if(getProperty(options, name) === undefined)
						setProperty(options, name, this.defaults[name]);
					break;
				case "call":
					setProperty(options, name, this.defaults[name].call(this, getProperty(options, name), options), options);
					break;
				case "make":
					if(getProperty(options, name) === undefined)
						setProperty(options, name, this.defaults[name].call(this, options), options);
					break;
				case "append":
					{
						let oldValue = getProperty(options, name);
						if(!Array.isArray(oldValue)) oldValue = [];
						oldValue.push.apply(oldValue, this.defaults[name]);
						setProperty(options, name, oldValue);
						break;
					}
				default:
					throw new Error("OptionsDefaulter cannot process " + this.config[name]);
			}
		}
		// TODO: change this for webpack 4: return options;
	}

	set(name, config, def) {
		if(arguments.length === 3) {
			this.defaults[name] = def;
			this.config[name] = config;
		} else {
			this.defaults[name] = config;
			delete this.config[name];
		}
	}
}

module.exports = OptionsDefaulter;
