/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

function NodeOutputFileSystem() {}
module.exports = NodeOutputFileSystem;

NodeOutputFileSystem.prototype.mkdirp = mkdirp;
NodeOutputFileSystem.prototype.mkdir = fs.mkdir.bind(this);
NodeOutputFileSystem.prototype.rmdir = fs.rmdir.bind(this);
NodeOutputFileSystem.prototype.unlink = fs.unlink.bind(this);
NodeOutputFileSystem.prototype.writeFile = fs.writeFile.bind(fs);
NodeOutputFileSystem.prototype.join = path.join.bind(path);
