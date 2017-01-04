"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
class NodeOutputFileSystem {
}
NodeOutputFileSystem.prototype.mkdirp = mkdirp;
NodeOutputFileSystem.prototype.mkdir = fs.mkdir.bind(this);
NodeOutputFileSystem.prototype.rmdir = fs.rmdir.bind(this);
NodeOutputFileSystem.prototype.unlink = fs.unlink.bind(this);
NodeOutputFileSystem.prototype.writeFile = fs.writeFile.bind(fs);
NodeOutputFileSystem.prototype.join = path.join.bind(path);
module.exports = NodeOutputFileSystem;
