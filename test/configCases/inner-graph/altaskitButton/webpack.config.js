const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"babel-runtime/helpers/extends": ["default"],
			"babel-runtime/core-js/object/get-prototype-of": ["default"],
			"babel-runtime/helpers/classCallCheck": ["default"],
			"babel-runtime/helpers/createClass": ["default"],
			"babel-runtime/helpers/possibleConstructorReturn": ["default"],
			"babel-runtime/helpers/inherits": ["default"],
			"babel-runtime/helpers/taggedTemplateLiteral": ["default"],
			react: ["Component", "default"],
			"styled-components": ["default"],
			"@atlaskit/analytics-next": [
				"withAnalyticsContext",
				"withAnalyticsEvents"
			],
			"../../package.json": ["name", "version"],
			"./withDeprecationWarnings": ["default"],
			"./getButtonProps": ["default"],
			"../styled/getButtonStyles": ["default"],
			"../styled/ButtonContent": ["default"],
			"../styled/ButtonWrapper": ["default"],
			"../styled/IconWrapper": ["default"],
			"../styled/LoadingSpinner": ["default"],
			"./CustomComponentProxy": ["default"]
		}
	},
	all: {
		usedExports: ["default", "ButtonBase"],
		expect: {
			"babel-runtime/helpers/extends": ["default"],
			"babel-runtime/core-js/object/get-prototype-of": ["default"],
			"babel-runtime/helpers/classCallCheck": ["default"],
			"babel-runtime/helpers/createClass": ["default"],
			"babel-runtime/helpers/possibleConstructorReturn": ["default"],
			"babel-runtime/helpers/inherits": ["default"],
			"babel-runtime/helpers/taggedTemplateLiteral": ["default"],
			react: ["Component", "default"],
			"styled-components": ["default"],
			"@atlaskit/analytics-next": [
				"withAnalyticsContext",
				"withAnalyticsEvents"
			],
			"../../package.json": ["name", "version"],
			"./withDeprecationWarnings": ["default"],
			"./getButtonProps": ["default"],
			"../styled/getButtonStyles": ["default"],
			"../styled/ButtonContent": ["default"],
			"../styled/ButtonWrapper": ["default"],
			"../styled/IconWrapper": ["default"],
			"../styled/LoadingSpinner": ["default"],
			"./CustomComponentProxy": ["default"]
		}
	}
});
