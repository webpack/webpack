/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Aviv Keller @avivkeller
*/

// webpack-sources is CommonJS with getter-based lazy exports, which are
// invisible to the ESM named-import interop; re-export its classes here.
// Types come from the sibling webpack-sources.d.ts.
import webpackSources from "webpack-sources";

const {
	CachedSource,
	CompatSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	SizeOnlySource,
	SourceMapSource
} = webpackSources;

export {
	CachedSource,
	CompatSource,
	ConcatSource,
	OriginalSource,
	PrefixSource,
	RawSource,
	ReplaceSource,
	SizeOnlySource,
	SourceMapSource
};
