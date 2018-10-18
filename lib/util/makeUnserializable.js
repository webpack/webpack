/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const ObjectMiddleware = require("../serialization/ObjectMiddleware");

module.exports = Constructor => {
	ObjectMiddleware.registerNotSerializable(Constructor);
};
