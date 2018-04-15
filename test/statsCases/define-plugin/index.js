import(/* webpackMode: SERVER ? "eager" : "lazy" */
/* webpackChunkName: CHUNK_INFO.chunkName */ "./a.js");

const template = "empty";
import(
	/*
		webpackChunkName: CHUNK_INFO.contextChunkName(),
		webpackInclude: CHUNK_INFO.contextInclude,
		webpackExclude: CHUNK_INFO.contextExclude,
	*/ `./dir/${template}`);

module.exports = VALUE;
