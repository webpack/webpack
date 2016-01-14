/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function OptionsDefaulter() {
	this.defaults = {};
	this.config = {};
}
module.exports = OptionsDefaulter;

function getProperty(obj, name) {
	name = name.split(".");
	for(var i = 0; i < name.length - 1; i++) {
		obj = obj[name[i]];
		if(typeof obj != "object" || !obj) return;
	}
	return obj[name.pop()];
}

function setProperty(obj, name, value) {
	name = name.split(".");
	for(var i = 0; i < name.length - 1; i++) {
		if(typeof(obj[name[i]]) !== "object" || !obj[name[i]]) obj[name[i]] = {};
		obj = obj[name[i]];
	}
	obj[name.pop()] = value;
}

function hasProperty(obj, name, value) {
	name = name.split(".");
	for(var i = 0; i < name.length - 1; i++) {
		obj = obj[name[i]];
		if(typeof obj != "object" || !obj) return false;
	}
	return Object.prototype.hasOwnProperty.call(obj, name.pop());
}

OptionsDefaulter.prototype.process = function(options) {
	for(var name in this.defaults) {
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
				var oldValue = getProperty(options, name);
				if(!Array.isArray(oldValue)) oldValue = [];
				this.defaults[name].forEach(function(item) {
					oldValue.push(item);
				});
				setProperty(options, name, oldValue);
				break;
			default:
				throw new Error("OptionsDefaulter cannot process " + this.config[name]);
		}
	}
};

OptionsDefaulter.prototype.set = function(name, config, def) {
	if(arguments.length === 3) {
		this.defaults[name] = def;
		this.config[name] = config;
	} else {
		this.defaults[name] = config;
		delete this.config[name];
	}
};
