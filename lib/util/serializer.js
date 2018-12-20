/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const BinaryMiddleware = require("../serialization/BinaryMiddleware");
const FileMiddleware = require("../serialization/FileMiddleware");
const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const Serializer = require("../serialization/Serializer");

const serializer = new Serializer(
	[new ObjectMiddleware(), new BinaryMiddleware(), new FileMiddleware()],
	{
		singleItem: true
	}
);

require("./registerExternalSerializer");

// Load internal paths with a relative require
// This allows bundling all internal serializers
ObjectMiddleware.registerLoader(/^webpack\/lib\//, req =>
	require("../" + req.slice("webpack/lib/".length))
);

module.exports = serializer;
