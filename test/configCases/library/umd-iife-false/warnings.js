"use strict";

module.exports = [
	[
		/^Configuration:\nSetting 'output\.iife' to 'false' is incompatible with 'output\.library\.type' set to 'umd'\. This configuration may cause unexpected behavior, as UMD libraries are expected to use an IIFE \(Immediately Invoked Function Expression\) to support various module formats\. Consider setting 'output\.iife' to 'true' or choosing a different 'library\.type' to ensure compatibility\.\nLearn more: https:\/\/webpack\.js\.org\/configuration\/output\/$/
	]
];
