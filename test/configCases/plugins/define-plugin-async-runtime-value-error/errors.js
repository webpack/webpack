"use strict";

// `: boom-shared` right after the prefix is what says the shared instance was
// annotated once: a second pass would leave `: DefinePlugin: failed …` there
const sharedOnce =
	/DefinePlugin: failed to evaluate value for "ASYNC_SHARED_BOOM" \(`runtimeValue\(anonymous\)`\): boom-shared/;

module.exports = [
	[
		/DefinePlugin: failed to evaluate value for "ASYNC_BOOM" \(`runtimeValue\(anonymous\)`\)[\s\S]*boom-async/
	],
	[
		/DefinePlugin: failed to evaluate value for "ASYNC_NAMED_BOOM" \(`runtimeValue\(namedGenerator\)`\)[\s\S]*boom-named/
	],
	[sharedOnce],
	[sharedOnce]
];
