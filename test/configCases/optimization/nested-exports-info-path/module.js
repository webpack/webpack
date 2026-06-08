export * from "./data.json";

// These are evaluated after global usage/provision analysis, so they reflect how
// index.js consumes the re-exported nested JSON. Each one drives one of the
// iterative path walks in ExportsInfo at depth >= 3.

// isExportProvided(["used","deep","leaf"]) -> true
export const provideLeaf = __webpack_exports_info__.used.deep.leaf.provideInfo;
// isExportProvided(["used","deep","missing"]) -> false (unknown nested key)
export const provideMissing = __webpack_exports_info__.used.deep.missing.provideInfo;
// isExportProvided(["used","sibling","deeper"]) -> undefined (descend past a provided leaf)
export const providePastLeaf =
	__webpack_exports_info__.used.sibling.deeper.provideInfo;

// getUsed(["used","deep","leaf"]) -> Used
export const usedLeaf = __webpack_exports_info__.used.deep.leaf.used;
// getUsed(["used","deep","other"]) -> Unused (sibling property is not used)
export const usedOther = __webpack_exports_info__.used.deep.other.used;
// getUsed(["unused"]) -> Unused
export const usedUnused = __webpack_exports_info__.unused.used;
// getUsed(["used"]) -> OnlyPropertiesUsed -> useInfo true
export const useInfoUsed = __webpack_exports_info__.used.useInfo;

// getReadOnlyExportInfoRecursive(["used","deep","leaf"]).canMangle
export const canMangleLeaf = __webpack_exports_info__.used.deep.leaf.canMangle;
