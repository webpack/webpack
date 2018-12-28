/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const ObjectMiddleware = require("../serialization/ObjectMiddleware");

exports.serializer = require("./serializer");

exports.register = ObjectMiddleware.register;
exports.registerLoader = ObjectMiddleware.registerLoader;
exports.registerNotSerializable = ObjectMiddleware.registerNotSerializable;
