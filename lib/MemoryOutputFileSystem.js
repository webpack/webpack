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

function pathToArray(path) {
	var nix = /^\//.test(path);
	if(!nix) {
		if(!/^[A-Za-z]:\\/.test(path)) return;
		path = path.replace(/\\/g, "/");
	}
	path = path.replace(/\/+/g, "/"); // multi slashs
	path = (nix ? path.substr(1) : path).split("/");
	if(!path[path.length-1]) path.pop();
	return path;
}

MemoryOutputFileSystem.prototype.mkdirp = function(_path, callback) {
	var path = pathToArray(_path);
	if(!path) return callback(new Error("Invalid path " + _path));
	if(path.length == 0) return callback();
	var current = this.data;
	for(var i = 0; i < path.length; i++) {
		if(isFile(current[path[i]]))
			return callback(new Error("Path is a file " + _path));
		else if(!isDir(current[path[i]]))
			current[path[i]] = {"":true};
		current = current[path[i]];
	}
	return callback();
};

MemoryOutputFileSystem.prototype.mkdir = function(_path, callback) {
	var path = pathToArray(_path);
	if(!path) return callback(new Error("Invalid path " + _path));
	if(path.length == 0) return callback();
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + _path));
		current = current[path[i]];
	}
	if(isDir(current[path[i]]))
		return callback(new Error("Directory already exist " + _path));
	else if(isFile(current[path[i]]))
		return callback(new Error("Cannot mkdir on file " + _path));
	current[path[i]] = {"":true};
	return callback();
};

MemoryOutputFileSystem.prototype.rmdir = function(_path, callback) {
	var path = pathToArray(_path);
	if(!path) return callback(new Error("Invalid path " + _path));
	if(path.length == 0) return callback(new Error("Path cannot be removed " + _path));
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + _path));
		current = current[path[i]];
	}
	if(!isDir(current[path[i]]))
		return callback(new Error("Directory doesn't exist " + _path));
	delete current[path[i]];
	return callback();
};

MemoryOutputFileSystem.prototype.unlink = function(_path, callback) {
	var path = pathToArray(_path);
	if(!path) return callback(new Error("Invalid path " + _path));
	if(path.length == 0) return callback(new Error("Path cannot be unlinked " + _path));
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + _path));
		current = current[path[i]];
	}
	if(!isFile(current[path[i]]))
		return callback(new Error("File doesn't exist " + _path));
	delete current[path[i]];
	return callback();
};

MemoryOutputFileSystem.prototype.writeFile = function(_path, content, callback) {
	if(!content) return callback(new Error("No content"));
	var path = pathToArray(_path);
	if(!path) return callback(new Error("Invalid path " + _path));
	if(path.length == 0) return callback(new Error("Path is not a file " + _path));
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			return callback(new Error("Path doesn't exists " + _path));
		current = current[path[i]];
	}
	if(isDir(current[path[i]]))
		return callback(new Error("Cannot writeFile on directory " + _path));
	current[path[i]] = content;
	return callback();
};

MemoryOutputFileSystem.prototype.join = function(a, b) {
	if(a[a.length-1] == "/") return a + b;
	if(a[a.length-1] == "\\") return a + b;
	return a + "/" + b;
};
