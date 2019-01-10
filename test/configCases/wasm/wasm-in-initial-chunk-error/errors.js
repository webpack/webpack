module.exports = [
	[
		/\.\/wasm.wat/,
		/WebAssembly module is included in initial chunk/,
		/\* \.\/index.js --> \.\/module.js --> \.\/wasm.wat/,
		/\* \.\.\. --> \.\/module.js --> \.\/module2.js --> \.\/wasm.wat/,
		/\* \.\.\. --> \.\/module2.js --> \.\/module3.js --> \.\/wasm.wat/
	],
	[
		/\.\/wasm2\.wat/,
		/WebAssembly module is included in initial chunk/,
		/\* \.\/index.js --> \.\/module.js --> \.\/module2.js --> \.\/module3.js --> \.\/wasm2.wat/
	]
];
