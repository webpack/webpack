/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const BinaryMiddleware = require("../serialization/BinaryMiddleware");
const FileMiddleware = require("../serialization/FileMiddleware");
const ObjectMiddleware = require("../serialization/ObjectMiddleware");
const Serializer = require("../serialization/Serializer");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const { register, registerLoader, registerNotSerializable } = ObjectMiddleware;

// Expose serialization API
exports.register = register;
exports.registerLoader = registerLoader;
exports.registerNotSerializable = registerNotSerializable;
exports.serializer = new Serializer(
	[new ObjectMiddleware(), new BinaryMiddleware(), new FileMiddleware()],
	{
		singleItem: true
	}
);

require("./registerExternalSerializer");

// Load internal paths with a relative require
// This allows bundling all internal serializers
registerLoader(/^webpack\/lib\//, req =>
	require("../" + req.slice("webpack/lib/".length))
);
