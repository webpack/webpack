// Both variants put the entry exports on the emitted file's own `module.exports`:
// `umd` returns them from the wrapper, `commonjs` copies them onto `exports`.
it("should export a dependOn entry with the commonjs chunk format", () => {
	expect(__non_webpack_require__("./middle.js").middle).toBe("middle+shared");
	expect(__non_webpack_require__("./leaf.js").leaf).toBe("leaf+middle+shared");
});
