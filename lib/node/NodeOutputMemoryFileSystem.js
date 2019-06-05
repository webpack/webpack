/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Even Stensberg @evenstensberg
*/

"use strict";

const path = require("path");
const memFs = require('memory-fs');

class NodeOutputMemoryFileSystem {
	constructor() {
        this.MemoryFileSystem = new memFs();
		this.mkdirp = this.MemoryFileSystem.mkdirp;
		this.mkdir = this.MemoryFileSystem.mkdir;
		this.rmdir = this.MemoryFileSystem.rmdir;
		this.unlink = this.MemoryFileSystem.unlink;
		this.writeFile = this.MemoryFileSystem.writeFile;
        this.join = path.join.bind(path);
        this.readFileSync = this.MemoryFileSystem.readFileSync;
        this.writeFileSync = this.MemoryFileSystem.writeFileSync;
        this.mkdirpSync = this.MemoryFileSystem.mkdirpSync;
	}
}

module.exports = NodeOutputMemoryFileSystem;