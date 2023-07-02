const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				global: undefined,
				class: prod ? "my-app-274-S" : "./style.module.css-class",
				currentWmultiParams: prod
					? "my-app-274-yK"
					: "./style.module.css-local12",
				futureWmultiParams: prod
					? "my-app-274-Y4"
					: "./style.module.css-local14",
				hasWmultiParams: prod ? "my-app-274-PK" : "./style.module.css-local11",
				matchesWmultiParams: prod
					? "my-app-274-$Y"
					: "./style.module.css-local9",
				mozAnyWmultiParams: prod
					? "my-app-274-TT"
					: "./style.module.css-local15",
				pastWmultiParams: prod ? "my-app-274-P_" : "./style.module.css-local13",
				webkitAnyWmultiParams: prod
					? "my-app-274-rT"
					: "./style.module.css-local16",
				whereWmultiParams: prod
					? "my-app-274-ie"
					: "./style.module.css-local10",
				local: prod
					? "my-app-274-Zw my-app-274-yl my-app-274-J_ my-app-274-gc"
					: "./style.module.css-local1 ./style.module.css-local2 ./style.module.css-local3 ./style.module.css-local4",
				local2: prod
					? "my-app-274-Xg my-app-274-AY"
					: "./style.module.css-local5 ./style.module.css-local6",
				nested: prod
					? "my-app-274-RX undefined my-app-274-X2"
					: "./style.module.css-nested1 undefined ./style.module.css-nested3",
				notWmultiParams: prod
					? "my-app-274-Kw"
					: "./style.module.css-local7",
				isWmultiParams: prod
					? "my-app-274-rw"
					: "./style.module.css-local8",
				ident: prod ? "my-app-274-yR" : "./style.module.css-ident",
				keyframes: prod ? "my-app-274-y3" : "./style.module.css-localkeyframes",
				animation: prod ? "my-app-274-oQ" : "./style.module.css-animation",
				vars: prod
					? "--my-app-274-y4 my-app-274-gR undefined my-app-274-xk"
					: "--./style.module.css-local-color ./style.module.css-vars undefined ./style.module.css-globalVars",
				media: prod
					? "my-app-274-w7"
					: "./style.module.css-wideScreenClass",
				mediaWithOperator: prod
					? "my-app-274-J"
					: "./style.module.css-narrowScreenClass",
				supports: prod
					? "my-app-274-T$"
					: "./style.module.css-displayGridInSupports",
				supportsWithOperator: prod
					? "my-app-274-zz"
					: "./style.module.css-floatRightInNegativeSupports",
				mediaInSupports: prod
					? "my-app-274-Kr"
					: "./style.module.css-displayFlexInMediaInSupports",
				supportsInMedia: prod
					? "my-app-274-SQ"
					: "./style.module.css-displayFlexInSupportsInMedia",
				displayFlexInSupportsInMediaUpperCase: prod
					? "my-app-274-XM"
					: "./style.module.css-displayFlexInSupportsInMediaUpperCase",
				keyframesUPPERCASE: prod
					? "my-app-274-T4"
					: "./style.module.css-localkeyframesUPPERCASE",
				localkeyframes2UPPPERCASE: prod
					? "my-app-274-Xi"
					: "./style.module.css-localkeyframes2UPPPERCASE",
				VARS: prod
					? "--my-app-274-DJ my-app-274-ms undefined my-app-274-cU"
					: "--./style.module.css-LOCAL-COLOR ./style.module.css-VARS undefined ./style.module.css-globalVarsUpperCase",
				inSupportScope: prod
					? "my-app-274-FO"
					: "./style.module.css-inSupportScope",
				animationName: prod
					? "my-app-274-w3"
					: "./style.module.css-animationName",
				mozAnimationName: prod
					? "my-app-274-t6"
					: "./style.module.css-mozAnimationName",
				myColor: prod
					? "--my-app-274-lC"
					: "--./style.module.css-my-color",
				paddingLg: prod
					? "my-app-274-FP"
					: "./style.module.css-padding-lg",
				paddingSm: prod
					? "my-app-274-zE"
					: "./style.module.css-padding-sm",
				classLocalScope: prod
					? "my-app-274-gz"
					: "./style.module.css-class-local-scope",
				inLocalGlobalScope: prod
					? "my-app-274-Zv"
					: "./style.module.css-in-local-global-scope",
				classInContainer: prod
					? "my-app-274-Gp"
					: "./style.module.css-class-in-container",
				deepClassInContainer: prod
					? "my-app-274-rn"
					: "./style.module.css-deep-class-in-container",
				cssModuleWithCustomFileExtension: prod
					? "my-app-444-s"
					: "./style.module.my-css-myCssClass",
				notAValidCssModuleExtension: true,
				UsedClassName: prod ? "my-app-627-Q3" : "./identifiers.module.css-UsedClassName",
			});

			const fs = __non_webpack_require__("fs");
			const path = __non_webpack_require__("path");
			const cssOutputFilename = prod ? "249.bundle1.css" : "use-style_js.bundle0.css";

			const cssContent = fs.readFileSync(
				path.join(__dirname, cssOutputFilename),
				"utf-8"
			);
			expect(cssContent).not.toContain(".my-app--");
			expect(cssContent).toMatchSnapshot();
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
