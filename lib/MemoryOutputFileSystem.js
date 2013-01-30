/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function MemoryOutputFileSystem(data) {
	this.data = data || {};
}
module.exports = MemoryOutputFileSystem;

function isDir(item) {
	if(typeof item != "object") return false;
	return item[""] === true;
}

function isFile(item) {
	if(typeof item == "string") return true;
	if(typeof item != "object") return false;
	return !item[""];
}

MemoryOutputFileSystem.prototype.mkdirp = function(path, callback) {
	if(path == "/") return callback();
	path = path.split("/");
	if(path[0] != "") return callback(new Error("Invalid path " + path.join("/")));
	var current = this.data;
	for(var i = 1; i < path.length; i++) {
		if(isFile(current[path[i]]))
			return callback(new Error("Path is a file " + path.join("/")));
		else if(!isDir(current[path[i]]))
			current[path[i]] = {"":true};
		current = current[path[i]];
	}
	return callback();
};

MemoryOutputFileSystem.prototype.mkdir = function(path, callback) {
	path = path.split("/");
	if(path[0] != "") return callback(new Error("Invalid path " + path.join("/")));
	var current = this.data;
	for(var i = 1; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + path.join("/")));
		current = current[path[i]];
	}
	if(isDir(current[path[i]]))
		return callback(new Error("Directory already exist " + path.join("/")));
	else if(isFile(current[path[i]]))
		return callback(new Error("Cannot mkdir on file " + path.join("/")));
	current[path[i]] = {"":true};
	return callback();
};
MemoryOutputFileSystem.prototype.rmdir = function(path, callback) {
	path = path.split("/");
	if(path[0] != "") return callback(new Error("Invalid path " + path.join("/")));
	var current = this.data;
	for(var i = 1; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + path.join("/")));
		current = current[path[i]];
	}
	if(!isDir(current[path[i]]))
		return callback(new Error("Directory doesn't exist " + path.join("/")));
	delete current[path[i]];
	return callback();
};
MemoryOutputFileSystem.prototype.unlink = function(path, callback) {
	path = path.split("/");
	if(path[0] != "") return callback(new Error("Invalid path " + path.join("/")));
	var current = this.data;
	for(var i = 1; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + path.join("/")));
		current = current[path[i]];
	}
	if(!isFile(current[path[i]]))
		return callback(new Error("File doesn't exist " + path.join("/")));
	delete current[path[i]];
	return callback();
};
MemoryOutputFileSystem.prototype.writeFile = function(path, content, callback) {
	if(!content) return callback(new Error("No content"));
	path = path.split("/");
	if(path[0] != "") return callback(new Error("Invalid path " + path.join("/")));
	var current = this.data;
	for(var i = 1; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + path.join("/")));
		current = current[path[i]];
	}
	if(isDir(current[path[i]]))
		return callback(new Error("Cannot writeFile on directory " + path.join("/")));
	current[path[i]] = content;
	return callback();
};
MemoryOutputFileSystem.prototype.join = function(a, b) {
	if(a == "/") return "/" + b;
	return a + "/" + b;
};
