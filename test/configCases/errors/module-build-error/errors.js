"use strict";

module.exports = [
	// V8 `.stack` already leads with "Error: v8 boom", so the whole stack is used.
	[/^Module build failed \(from .*loader\.js\):\nError: v8 boom\n\s+at /],
	// A frames-only stack would drop the message, so "name: message" leads instead
	// and the frames are dropped (asserted by the `$` anchors below).
	[/^Module build failed \(from .*loader\.js\):\nTypeError: jsc boom$/],
	[/^Module build failed \(from .*loader\.js\):\nno-name boom$/],
	// `hideStack` moves the frames into `details`.
	[
		{
			message: /^Module build failed \(from .*loader\.js\):\nhidden boom$/,
			details: /hidden-frame\.js:1:1/
		}
	],
	// No stack at all: the message alone.
	[/^Module build failed \(from .*loader\.js\):\nstackless boom$/],
	// Neither stack nor message: the error stringifies to its name.
	[/^Module build failed \(from .*loader\.js\):\nError$/],
	// Not raised by a loader, so there is no `from` prefix.
	[
		/^Module build failed: Error: Final loader \(.*non-buffer-loader\.js\) didn't return a Buffer or String/
	]
];
