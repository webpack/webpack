/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * Determines the 'as' attribute value for prefetch/preload based on file extension
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#what_types_of_content_can_be_preloaded
 * @param {string} request module request string or filename
 * @returns {string} asset type for link element 'as' attribute
 */
const getAssetType = (request) => {
	if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)$/i.test(request)) {
		return "image";
	} else if (/\.(woff2?|ttf|otf|eot)$/i.test(request)) {
		return "font";
	} else if (/\.(js|mjs|jsx|ts|tsx)$/i.test(request)) {
		return "script";
	} else if (/\.css$/i.test(request)) {
		return "style";
	} else if (/\.vtt$/i.test(request)) {
		return "track";
	} else if (
		/\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|avi|mov|wmv|mkv)$/i.test(request)
	) {
		// Audio/video files use 'fetch' as browser support varies
		return "fetch";
	}
	return "fetch";
};

module.exports = getAssetType;
