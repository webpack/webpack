const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				global: undefined,
				class: prod ? "my-app-491-S" : "./style.module.css-class",
				currentWmultiParams: prod
					? "my-app-491-yK"
					: "./style.module.css-local12",
				futureWmultiParams: prod
					? "my-app-491-Y4"
					: "./style.module.css-local14",
				hasWmultiParams: prod ? "my-app-491-PK" : "./style.module.css-local11",
				matchesWmultiParams: prod
					? "my-app-491-$Y"
					: "./style.module.css-local9",
				mozAnyWmultiParams: prod
					? "my-app-491-TT"
					: "./style.module.css-local15",
				pastWmultiParams: prod ? "my-app-491-P_" : "./style.module.css-local13",
				webkitAnyWmultiParams: prod
					? "my-app-491-rT"
					: "./style.module.css-local16",
				whereWmultiParams: prod
					? "my-app-491-ie"
					: "./style.module.css-local10",
				local: prod
					? "my-app-491-Zw my-app-491-yl my-app-491-J_ my-app-491-gc"
					: "./style.module.css-local1 ./style.module.css-local2 ./style.module.css-local3 ./style.module.css-local4",
				local2: prod
					? "my-app-491-Xg my-app-491-AY"
					: "./style.module.css-local5 ./style.module.css-local6",
				nested: prod
					? "my-app-491-RX undefined my-app-491-X2"
					: "./style.module.css-nested1 undefined ./style.module.css-nested3",
				notWmultiParams: prod
					? "my-app-491-Kw"
					: "./style.module.css-local7",
				isWmultiParams: prod
					? "my-app-491-rw"
					: "./style.module.css-local8",
				ident: prod ? "my-app-491-yR" : "./style.module.css-ident",
				keyframes: prod ? "my-app-491-y3" : "./style.module.css-localkeyframes",
				animation: prod ? "my-app-491-oQ" : "./style.module.css-animation",
				vars: prod
					? "--my-app-491-y4 my-app-491-gR undefined my-app-491-xk"
					: "--./style.module.css-local-color ./style.module.css-vars undefined ./style.module.css-globalVars",
				media: prod
					? "my-app-491-w7"
					: "./style.module.css-wideScreenClass",
				mediaWithOperator: prod
					? "my-app-491-J"
					: "./style.module.css-narrowScreenClass",
				supports: prod
					? "my-app-491-T$"
					: "./style.module.css-displayGridInSupports",
				supportsWithOperator: prod
					? "my-app-491-zz"
					: "./style.module.css-floatRightInNegativeSupports",
				mediaInSupports: prod
					? "my-app-491-Kr"
					: "./style.module.css-displayFlexInMediaInSupports",
				supportsInMedia: prod
					? "my-app-491-SQ"
					: "./style.module.css-displayFlexInSupportsInMedia",
				displayFlexInSupportsInMediaUpperCase: prod
					? "my-app-491-XM"
					: "./style.module.css-displayFlexInSupportsInMediaUpperCase",
				keyframesUPPERCASE: prod
					? "my-app-491-T4"
					: "./style.module.css-localkeyframesUPPERCASE",
				localkeyframes2UPPPERCASE: prod
					? "my-app-491-Xi"
					: "./style.module.css-localkeyframes2UPPPERCASE",
				VARS: prod
					? "--my-app-491-DJ my-app-491-ms undefined my-app-491-cU"
					: "--./style.module.css-LOCAL-COLOR ./style.module.css-VARS undefined ./style.module.css-globalVarsUpperCase",
				inSupportScope: prod
					? "my-app-491-FO"
					: "./style.module.css-inSupportScope",
				animationName: prod
					? "my-app-491-w3"
					: "./style.module.css-animationName",
				mozAnimationName: prod
					? "my-app-491-t6"
					: "./style.module.css-mozAnimationName"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
