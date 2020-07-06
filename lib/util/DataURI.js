/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

// data URL scheme: "data:text/javascript;charset=utf-8;base64,some-string"
// http://www.ietf.org/rfc/rfc2397.txt
const URIRegEx = /^data:([^;,]+)?((?:;(?:[^;,]+))*?)(;base64)?,(.*)$/i;

const decodeDataURI = uri => {
	const match = URIRegEx.exec(uri);
	if (!match) return null;

	const isBase64 = match[3];
	const body = match[4];
	return isBase64
		? Buffer.from(body, "base64")
		: Buffer.from(decodeURIComponent(body), "ascii");
};

const getMimetype = uri => {
	const match = URIRegEx.exec(uri);
	if (!match) return "";

	return match[1] || "text/plain";
};

module.exports = {
	decodeDataURI,
	getMimetype
};
