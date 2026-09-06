"use strict";

// the case reads the copied file off disk, which only a node target can do
module.exports = (config) =>
	config.target === "node" || config.target === "async-node";
