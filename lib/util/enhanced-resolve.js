/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Aviv Keller @avivkeller
*/

// enhanced-resolve is CommonJS with getter-based lazy exports, which are
// invisible to the ESM named-import interop; re-export what webpack uses.
// Types come from the sibling enhanced-resolve.d.ts.
import enhancedResolve from "enhanced-resolve";

const { CachedInputFileSystem, ResolverFactory, create, forEachBail } =
	enhancedResolve;

export { CachedInputFileSystem, ResolverFactory, create, forEachBail };
