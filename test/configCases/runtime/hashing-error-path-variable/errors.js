"use strict";

module.exports = [
	[
		{
			moduleName: /^webpack\/runtime\/root dir$/,
			message:
				/Generating the runtime module webpack\/runtime\/root dir \(RootDirRuntimeModule\) for hashing failed: Path variable \[contenthash\] not implemented in this context: inner\/\[name\]\.\[contenthash\]\.js/
		},
		{
			message:
				/ask compilation\.runtimeTemplate\.chunkRootOutputDir\(chunk, enforceRelative\)/
		}
	]
];
