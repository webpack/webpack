// prettier-ignore
/1;global.selfReferenceRegExpRan=true;1/g;

exports.settings = {
	reload() {
		return "reloaded";
	}
};

exports.isSettingsObject = function isSettingsObject() {
	// prettier-ignore
	return exports["settings"]instanceof Object;
};

exports.reloadNullish = () => (null ?? exports.settings?.reload)();

exports.reloadConditional = () => (1 ? exports.settings?.reload : 0)();
