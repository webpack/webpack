/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ArrayMap() {
	this.keys = [];
	this.values = [];
}
module.exports = ArrayMap;

ArrayMap.prototype.get = function(key) {
	for(var i = 0; i < this.keys.length; i++) {
		if(this.keys[i] === key) {
			return this.values[i];
		}
	}
	return;
};

ArrayMap.prototype.set = function(key, value) {
	for(var i = 0; i < this.keys.length; i++) {
		if(this.keys[i] === key) {
			this.values[i] = value;
			return this;
		}
	}
	this.keys.push(key);
	this.values.push(value);
	return this;
};

ArrayMap.prototype.remove = function(key) {
	for(var i = 0; i < this.keys.length; i++) {
		if(this.keys[i] === key) {
			this.keys.splice(i, 1);
			this.values.splice(i, 1);
			return true;
		}
	}
	return false;
};

ArrayMap.prototype.clone = function() {
	var newMap = new ArrayMap();
	for(var i = 0; i < this.keys.length; i++) {
		newMap.keys.push(this.keys[i]);
		newMap.values.push(this.values[i]);
	}
	return newMap;
};
