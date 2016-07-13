This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server elsewise there is an overhead for the increased number of requests.

The AggressiveSplittingPlugin split every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB code (after minimizing this reduces to ~10kB). It groups modules together by folder structure. We assume modules in the same folder as similar likely to change and minimize and gzip good together.

The AggressiveSplittingPlugin records it's splitting in the webpack records and try to restore splitting from records. This ensures that after changes to the application old splittings (and chunks) are reused. They are probably already in the clients cache. Therefore it's heavily recommended to use records!

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating too many chunks for every change.

Chunks can get invalid if a module changes. Modules from invalid chunks go back into the module pool and new chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

``` js
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "js", "records.json")
};
```

# Info

## Uncompressed

```
Hash: db9e88642ccb12a1264f
Version: webpack 2.1.0-beta.16
Time: 1044ms
                  Asset     Size  Chunks             Chunk Names
8fcb4106a762189b462e.js  52.9 kB       7  [emitted]  
42f9c68ce2db0b310159.js  55.7 kB       0  [emitted]  
c24df64c9d1be3f14bed.js  54.5 kB       2  [emitted]  
c9045e231c8edbc788ae.js  53.7 kB       3  [emitted]  
cbb6123321cf7cb9fde9.js  53.9 kB       4  [emitted]  
a2919251072756ed702d.js  52.6 kB       5  [emitted]  
71a18b9485bf6fa9a2d0.js  52.6 kB       6  [emitted]  
195c9326275620b0e9c2.js  54.4 kB       1  [emitted]  
9ae8368950c8db526738.js  51.8 kB       8  [emitted]  
d360e87fdf3111b702b6.js  50.8 kB       9  [emitted]  
cc545b839be6a4ff018f.js    50 kB      10  [emitted]  
ae79591633a901193537.js  59.7 kB      11  [emitted]  
754fd6b76d55855b537f.js  20.1 kB      12  [emitted]  
c3adbf94e7e39acf7373.js  33.8 kB      13  [emitted]  
Entrypoint main = ae79591633a901193537.js 754fd6b76d55855b537f.js c3adbf94e7e39acf7373.js
chunk    {0} 42f9c68ce2db0b310159.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [25] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [31] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [64] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [65] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [66] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [67] (webpack)/~/fbjs/lib/shallowEqual.js 1.66 kB {0} [built]
   [68] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [72] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {0} [built]
   [89] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [90] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [91] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [92] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [94] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
   [97] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
   [98] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
   [99] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [100] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [101] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [102] (webpack)/~/react/lib/BeforeInputEventPlugin.js 13.9 kB {0} [built]
  [103] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {0} [built]
chunk    {1} 195c9326275620b0e9c2.js 49.2 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [47] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {1} [built]
   [48] (webpack)/~/react/lib/setInnerHTML.js 3.91 kB {1} [built]
   [58] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {1} [built]
   [59] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {1} [built]
   [60] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {1} [built]
   [61] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {1} [built]
   [62] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {1} [built]
   [63] (webpack)/~/react/lib/validateDOMNesting.js 13.1 kB {1} [built]
   [83] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {1} [built]
   [84] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {1} [built]
   [85] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {1} [built]
   [86] (webpack)/~/react/lib/instantiateReactComponent.js 5.68 kB {1} [built]
   [87] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {1} [built]
   [88] (webpack)/~/react/lib/setTextContent.js 1.4 kB {1} [built]
  [155] (webpack)/~/react/lib/flattenChildren.js 2.31 kB {1} [built]
  [156] (webpack)/~/react/lib/getEventKey.js 2.9 kB {1} [built]
  [157] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {1} [built]
  [158] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {1} [built]
  [159] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {1} [built]
chunk    {2} c24df64c9d1be3f14bed.js 49.7 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [41] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {2} [built]
   [55] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {2} [built]
   [75] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {2} [built]
   [76] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {2} [built]
   [77] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {2} [built]
   [79] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {2} [built]
   [80] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {2} [built]
  [124] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {2} [built]
  [126] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {2} [built]
  [127] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {2} [built]
  [129] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {2} [built]
  [130] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {2} [built]
  [131] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {2} [built]
  [132] (webpack)/~/react/lib/ReactMultiChild.js 14.6 kB {2} [built]
  [135] (webpack)/~/react/lib/ReactRef.js 2.35 kB {2} [built]
chunk    {3} c9045e231c8edbc788ae.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [42] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {3} [built]
   [43] (webpack)/~/react/lib/Transaction.js 9.61 kB {3} [built]
   [46] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {3} [built]
   [57] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {3} [built]
   [82] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {3} [built]
  [140] (webpack)/~/react/lib/SimpleEventPlugin.js 18.8 kB {3} [built]
  [148] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {3} [built]
  [149] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {3} [built]
  [150] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {3} [built]
  [151] (webpack)/~/react/lib/adler32.js 1.22 kB {3} [built]
  [152] (webpack)/~/react/lib/checkReactTypeSpec.js 3.68 kB {3} [built]
  [153] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {3} [built]
  [154] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {3} [built]
chunk    {4} cbb6123321cf7cb9fde9.js 50 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [30] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {4} [built]
   [32] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {4} [built]
   [45] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.5 kB {4} [built]
   [74] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {4} [built]
  [110] (webpack)/~/react/lib/ReactChildReconciler.js 5.2 kB {4} [built]
  [112] (webpack)/~/react/lib/ReactDOM.js 4.66 kB {4} [built]
  [115] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {4} [built]
  [116] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.95 kB {4} [built]
  [117] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {4} [built]
  [118] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {4} [built]
  [119] (webpack)/~/react/lib/ReactDOMInput.js 11.4 kB {4} [built]
  [120] (webpack)/~/react/lib/ReactDOMInstrumentation.js 571 bytes {4} [built]
  [121] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {4} [built]
chunk    {5} a2919251072756ed702d.js 49.6 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [33] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [35] (webpack)/~/react/lib/SyntheticEvent.js 8.73 kB {5} [built]
   [56] (webpack)/~/react/lib/ReactUpdateQueue.js 8.97 kB {5} [built]
  [138] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.32 kB {5} [built]
  [139] (webpack)/~/react/lib/SelectEventPlugin.js 6.49 kB {5} [built]
  [142] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {5} [built]
  [143] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {5} [built]
  [144] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {5} [built]
  [145] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {5} [built]
  [146] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {5} [built]
  [147] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {5} [built]
chunk    {6} 71a18b9485bf6fa9a2d0.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/EventConstants.js 2.17 kB {6} [built]
   [39] (webpack)/~/react/lib/EventPluginHub.js 8.06 kB {6} [built]
   [40] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {6} [built]
   [51] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {6} [built]
   [52] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {6} [built]
   [53] (webpack)/~/react/lib/LinkedValueUtils.js 5.19 kB {6} [built]
   [54] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.72 kB {6} [built]
   [71] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 1.24 kB {6} [built]
  [108] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {6} [built]
  [109] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.35 kB {6} [built]
  [113] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {6} [built]
chunk    {7} 8fcb4106a762189b462e.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {7} [built]
   [37] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {7} [built]
   [44] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {7} [built]
   [49] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {7} [built]
   [50] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {7} [built]
   [69] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {7} [built]
   [70] (webpack)/~/react/lib/DOMPropertyOperations.js 7.85 kB {7} [built]
  [104] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {7} [built]
  [105] (webpack)/~/react/lib/Danger.js 2.27 kB {7} [built]
  [106] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {7} [built]
  [107] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {7} [built]
chunk    {8} 9ae8368950c8db526738.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [38] (webpack)/~/react/lib/ReactReconciler.js 7.11 kB {8} [built]
   [78] (webpack)/~/react/lib/ReactMount.js 24.6 kB {8} [built]
   [81] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {8} [built]
  [133] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {8} [built]
  [134] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {8} [built]
  [136] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {8} [built]
  [137] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {8} [built]
  [141] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {8} [built]
chunk    {9} d360e87fdf3111b702b6.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
  [114] (webpack)/~/react/lib/ReactDOMComponent.js 38.9 kB {9} [built]
  [123] (webpack)/~/react/lib/ReactDOMTextComponent.js 6.14 kB {9} [built]
  [125] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {9} [built]
  [128] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {9} [built]
chunk   {10} cc545b839be6a4ff018f.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [73] (webpack)/~/react/lib/ReactDOMSelect.js 6.9 kB {10} [built]
  [111] (webpack)/~/react/lib/ReactCompositeComponent.js 35.7 kB {10} [built]
  [122] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {10} [built]
  [160] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {10} [built]
chunk   {11} ae79591633a901193537.js 49.8 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [29] ./example.js 
    [0] (webpack)/~/react/lib/ReactElement.js 12.2 kB {11} [built]
    [1] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {11} [built]
    [2] (webpack)/~/fbjs/lib/warning.js 1.75 kB {11} [built]
    [4] (webpack)/~/object-assign/index.js 1.99 kB {11} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {11} [built]
    [6] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {11} [built]
    [7] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {11} [built]
    [8] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {11} [built]
    [9] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {11} [built]
   [10] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {11} [built]
   [11] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {11} [built]
   [14] (webpack)/~/react/react.js 56 bytes {11} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {11} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {11} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {11} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {11} [built]
   [20] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {11} [built]
   [24] (webpack)/~/fbjs/lib/mapObject.js 1.44 kB {11} [built]
   [26] (webpack)/~/react/lib/React.js 2.62 kB {11} [built]
   [27] (webpack)/~/react/lib/ReactDOMFactories.js 3.34 kB {11} [built]
chunk   {12} 754fd6b76d55855b537f.js 18.5 kB [initial] [rendered]
    > aggressive-splitted main [29] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {12} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {12} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactPropTypes.js 13.7 kB {12} [built]
   [23] (webpack)/~/react/lib/ReactVersion.js 382 bytes {12} [built]
   [28] (webpack)/~/react/lib/onlyChild.js 1.36 kB {12} [built]
chunk   {13} c3adbf94e7e39acf7373.js 33.1 kB [initial] [rendered]
    > aggressive-splitted main [29] ./example.js 
   [19] (webpack)/~/react/lib/traverseAllChildren.js 6.38 kB {13} [built]
   [21] (webpack)/~/react/lib/ReactClass.js 26.7 kB {13} [built]
   [29] ./example.js 44 bytes {13} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: db9e88642ccb12a1264f
Version: webpack 2.1.0-beta.16
Time: 2704ms
                  Asset     Size  Chunks             Chunk Names
8fcb4106a762189b462e.js  11.2 kB       7  [emitted]  
42f9c68ce2db0b310159.js  10.4 kB       0  [emitted]  
c24df64c9d1be3f14bed.js  10.5 kB       2  [emitted]  
c9045e231c8edbc788ae.js  14.2 kB       3  [emitted]  
cbb6123321cf7cb9fde9.js  10.5 kB       4  [emitted]  
a2919251072756ed702d.js  13.7 kB       5  [emitted]  
71a18b9485bf6fa9a2d0.js  12.4 kB       6  [emitted]  
195c9326275620b0e9c2.js  7.44 kB       1  [emitted]  
9ae8368950c8db526738.js  7.79 kB       8  [emitted]  
d360e87fdf3111b702b6.js  12.9 kB       9  [emitted]  
cc545b839be6a4ff018f.js  10.8 kB      10  [emitted]  
ae79591633a901193537.js  11.4 kB      11  [emitted]  
754fd6b76d55855b537f.js  5.01 kB      12  [emitted]  
c3adbf94e7e39acf7373.js  4.68 kB      13  [emitted]  
Entrypoint main = ae79591633a901193537.js 754fd6b76d55855b537f.js c3adbf94e7e39acf7373.js
chunk    {0} 42f9c68ce2db0b310159.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [25] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [31] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [64] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [65] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [66] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [67] (webpack)/~/fbjs/lib/shallowEqual.js 1.66 kB {0} [built]
   [68] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [72] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {0} [built]
   [89] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [90] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [91] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [92] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [94] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
   [97] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
   [98] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
   [99] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [100] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [101] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [102] (webpack)/~/react/lib/BeforeInputEventPlugin.js 13.9 kB {0} [built]
  [103] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {0} [built]
chunk    {1} 195c9326275620b0e9c2.js 49.2 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [47] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {1} [built]
   [48] (webpack)/~/react/lib/setInnerHTML.js 3.91 kB {1} [built]
   [58] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {1} [built]
   [59] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {1} [built]
   [60] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {1} [built]
   [61] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {1} [built]
   [62] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {1} [built]
   [63] (webpack)/~/react/lib/validateDOMNesting.js 13.1 kB {1} [built]
   [83] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {1} [built]
   [84] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {1} [built]
   [85] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {1} [built]
   [86] (webpack)/~/react/lib/instantiateReactComponent.js 5.68 kB {1} [built]
   [87] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {1} [built]
   [88] (webpack)/~/react/lib/setTextContent.js 1.4 kB {1} [built]
  [155] (webpack)/~/react/lib/flattenChildren.js 2.31 kB {1} [built]
  [156] (webpack)/~/react/lib/getEventKey.js 2.9 kB {1} [built]
  [157] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {1} [built]
  [158] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {1} [built]
  [159] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {1} [built]
chunk    {2} c24df64c9d1be3f14bed.js 49.7 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [41] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {2} [built]
   [55] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {2} [built]
   [75] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {2} [built]
   [76] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {2} [built]
   [77] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {2} [built]
   [79] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {2} [built]
   [80] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {2} [built]
  [124] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {2} [built]
  [126] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {2} [built]
  [127] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {2} [built]
  [129] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {2} [built]
  [130] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {2} [built]
  [131] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {2} [built]
  [132] (webpack)/~/react/lib/ReactMultiChild.js 14.6 kB {2} [built]
  [135] (webpack)/~/react/lib/ReactRef.js 2.35 kB {2} [built]
chunk    {3} c9045e231c8edbc788ae.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [42] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {3} [built]
   [43] (webpack)/~/react/lib/Transaction.js 9.61 kB {3} [built]
   [46] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {3} [built]
   [57] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {3} [built]
   [82] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {3} [built]
  [140] (webpack)/~/react/lib/SimpleEventPlugin.js 18.8 kB {3} [built]
  [148] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {3} [built]
  [149] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {3} [built]
  [150] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {3} [built]
  [151] (webpack)/~/react/lib/adler32.js 1.22 kB {3} [built]
  [152] (webpack)/~/react/lib/checkReactTypeSpec.js 3.68 kB {3} [built]
  [153] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {3} [built]
  [154] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {3} [built]
chunk    {4} cbb6123321cf7cb9fde9.js 50 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [30] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {4} [built]
   [32] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {4} [built]
   [45] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.5 kB {4} [built]
   [74] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {4} [built]
  [110] (webpack)/~/react/lib/ReactChildReconciler.js 5.2 kB {4} [built]
  [112] (webpack)/~/react/lib/ReactDOM.js 4.66 kB {4} [built]
  [115] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {4} [built]
  [116] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.95 kB {4} [built]
  [117] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {4} [built]
  [118] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {4} [built]
  [119] (webpack)/~/react/lib/ReactDOMInput.js 11.4 kB {4} [built]
  [120] (webpack)/~/react/lib/ReactDOMInstrumentation.js 571 bytes {4} [built]
  [121] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {4} [built]
chunk    {5} a2919251072756ed702d.js 49.6 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [33] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [35] (webpack)/~/react/lib/SyntheticEvent.js 8.73 kB {5} [built]
   [56] (webpack)/~/react/lib/ReactUpdateQueue.js 8.97 kB {5} [built]
  [138] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.32 kB {5} [built]
  [139] (webpack)/~/react/lib/SelectEventPlugin.js 6.49 kB {5} [built]
  [142] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {5} [built]
  [143] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {5} [built]
  [144] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {5} [built]
  [145] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {5} [built]
  [146] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {5} [built]
  [147] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {5} [built]
chunk    {6} 71a18b9485bf6fa9a2d0.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/EventConstants.js 2.17 kB {6} [built]
   [39] (webpack)/~/react/lib/EventPluginHub.js 8.06 kB {6} [built]
   [40] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {6} [built]
   [51] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {6} [built]
   [52] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {6} [built]
   [53] (webpack)/~/react/lib/LinkedValueUtils.js 5.19 kB {6} [built]
   [54] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.72 kB {6} [built]
   [71] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 1.24 kB {6} [built]
  [108] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {6} [built]
  [109] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.35 kB {6} [built]
  [113] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {6} [built]
chunk    {7} 8fcb4106a762189b462e.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {7} [built]
   [37] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {7} [built]
   [44] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {7} [built]
   [49] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {7} [built]
   [50] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {7} [built]
   [69] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {7} [built]
   [70] (webpack)/~/react/lib/DOMPropertyOperations.js 7.85 kB {7} [built]
  [104] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {7} [built]
  [105] (webpack)/~/react/lib/Danger.js 2.27 kB {7} [built]
  [106] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {7} [built]
  [107] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {7} [built]
chunk    {8} 9ae8368950c8db526738.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [38] (webpack)/~/react/lib/ReactReconciler.js 7.11 kB {8} [built]
   [78] (webpack)/~/react/lib/ReactMount.js 24.6 kB {8} [built]
   [81] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {8} [built]
  [133] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {8} [built]
  [134] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {8} [built]
  [136] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {8} [built]
  [137] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {8} [built]
  [141] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {8} [built]
chunk    {9} d360e87fdf3111b702b6.js 49.8 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
  [114] (webpack)/~/react/lib/ReactDOMComponent.js 38.9 kB {9} [built]
  [123] (webpack)/~/react/lib/ReactDOMTextComponent.js 6.14 kB {9} [built]
  [125] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {9} [built]
  [128] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {9} [built]
chunk   {10} cc545b839be6a4ff018f.js 49.9 kB {13} {11} {12} [rendered] [recorded]
    > aggressive-splitted [29] ./example.js 2:0-22
   [73] (webpack)/~/react/lib/ReactDOMSelect.js 6.9 kB {10} [built]
  [111] (webpack)/~/react/lib/ReactCompositeComponent.js 35.7 kB {10} [built]
  [122] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {10} [built]
  [160] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {10} [built]
chunk   {11} ae79591633a901193537.js 49.8 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [29] ./example.js 
    [0] (webpack)/~/react/lib/ReactElement.js 12.2 kB {11} [built]
    [1] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {11} [built]
    [2] (webpack)/~/fbjs/lib/warning.js 1.75 kB {11} [built]
    [4] (webpack)/~/object-assign/index.js 1.99 kB {11} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {11} [built]
    [6] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {11} [built]
    [7] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {11} [built]
    [8] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {11} [built]
    [9] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {11} [built]
   [10] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {11} [built]
   [11] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {11} [built]
   [14] (webpack)/~/react/react.js 56 bytes {11} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {11} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {11} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {11} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {11} [built]
   [20] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {11} [built]
   [24] (webpack)/~/fbjs/lib/mapObject.js 1.44 kB {11} [built]
   [26] (webpack)/~/react/lib/React.js 2.62 kB {11} [built]
   [27] (webpack)/~/react/lib/ReactDOMFactories.js 3.34 kB {11} [built]
chunk   {12} 754fd6b76d55855b537f.js 18.5 kB [initial] [rendered]
    > aggressive-splitted main [29] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {12} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {12} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {12} [built]
   [22] (webpack)/~/react/lib/ReactPropTypes.js 13.7 kB {12} [built]
   [23] (webpack)/~/react/lib/ReactVersion.js 382 bytes {12} [built]
   [28] (webpack)/~/react/lib/onlyChild.js 1.36 kB {12} [built]
chunk   {13} c3adbf94e7e39acf7373.js 33.1 kB [initial] [rendered]
    > aggressive-splitted main [29] ./example.js 
   [19] (webpack)/~/react/lib/traverseAllChildren.js 6.38 kB {13} [built]
   [21] (webpack)/~/react/lib/ReactClass.js 26.7 kB {13} [built]
   [29] ./example.js 44 bytes {13} [built]
```

## Records

```
{
  "nextFreeModuleId": 161,
  "modules": {
    "byIdentifier": {
      "..\\..\\node_modules\\react\\lib\\ReactElement.js": 0,
      "..\\..\\node_modules\\fbjs\\lib\\invariant.js": 1,
      "..\\..\\node_modules\\fbjs\\lib\\warning.js": 2,
      "..\\..\\node_modules\\react\\lib\\reactProdInvariant.js": 3,
      "..\\..\\node_modules\\object-assign\\index.js": 4,
      "..\\..\\node_modules\\fbjs\\lib\\emptyFunction.js": 5,
      "..\\..\\node_modules\\react\\lib\\ReactCurrentOwner.js": 6,
      "..\\..\\node_modules\\fbjs\\lib\\emptyObject.js": 7,
      "..\\..\\node_modules\\fbjs\\lib\\keyMirror.js": 8,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocationNames.js": 9,
      "..\\..\\node_modules\\react\\lib\\ReactComponent.js": 10,
      "..\\..\\node_modules\\react\\lib\\ReactNoopUpdateQueue.js": 11,
      "..\\..\\node_modules\\react\\lib\\canDefineProperty.js": 12,
      "..\\..\\node_modules\\react\\lib\\getIteratorFn.js": 13,
      "..\\..\\node_modules\\react\\react.js": 14,
      "..\\..\\node_modules\\fbjs\\lib\\keyOf.js": 15,
      "..\\..\\node_modules\\react\\lib\\PooledClass.js": 16,
      "..\\..\\node_modules\\react\\lib\\KeyEscapeUtils.js": 17,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocations.js": 18,
      "..\\..\\node_modules\\react\\lib\\traverseAllChildren.js": 19,
      "..\\..\\node_modules\\react\\lib\\ReactChildren.js": 20,
      "..\\..\\node_modules\\react\\lib\\ReactClass.js": 21,
      "..\\..\\node_modules\\react\\lib\\ReactPropTypes.js": 22,
      "..\\..\\node_modules\\react\\lib\\ReactVersion.js": 23,
      "..\\..\\node_modules\\fbjs\\lib\\mapObject.js": 24,
      "..\\..\\node_modules\\react-dom\\index.js": 25,
      "..\\..\\node_modules\\react\\lib\\React.js": 26,
      "..\\..\\node_modules\\react\\lib\\ReactDOMFactories.js": 27,
      "..\\..\\node_modules\\react\\lib\\onlyChild.js": 28,
      "example.js": 29,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponentTree.js": 30,
      "..\\..\\node_modules\\fbjs\\lib\\ExecutionEnvironment.js": 31,
      "..\\..\\node_modules\\react\\lib\\ReactInstrumentation.js": 32,
      "..\\..\\node_modules\\react\\lib\\ReactUpdates.js": 33,
      "..\\..\\node_modules\\react\\lib\\EventConstants.js": 34,
      "..\\..\\node_modules\\react\\lib\\SyntheticEvent.js": 35,
      "..\\..\\node_modules\\react\\lib\\DOMLazyTree.js": 36,
      "..\\..\\node_modules\\react\\lib\\DOMProperty.js": 37,
      "..\\..\\node_modules\\react\\lib\\ReactReconciler.js": 38,
      "..\\..\\node_modules\\react\\lib\\EventPluginHub.js": 39,
      "..\\..\\node_modules\\react\\lib\\EventPropagators.js": 40,
      "..\\..\\node_modules\\react\\lib\\ReactInstanceMap.js": 41,
      "..\\..\\node_modules\\react\\lib\\SyntheticUIEvent.js": 42,
      "..\\..\\node_modules\\react\\lib\\Transaction.js": 43,
      "..\\..\\node_modules\\react\\lib\\DisabledInputUtils.js": 44,
      "..\\..\\node_modules\\react\\lib\\ReactBrowserEventEmitter.js": 45,
      "..\\..\\node_modules\\react\\lib\\SyntheticMouseEvent.js": 46,
      "..\\..\\node_modules\\react\\lib\\escapeTextContentForBrowser.js": 47,
      "..\\..\\node_modules\\react\\lib\\setInnerHTML.js": 48,
      "..\\..\\node_modules\\react\\lib\\DOMChildrenOperations.js": 49,
      "..\\..\\node_modules\\react\\lib\\DOMNamespaces.js": 50,
      "..\\..\\node_modules\\react\\lib\\EventPluginRegistry.js": 51,
      "..\\..\\node_modules\\react\\lib\\EventPluginUtils.js": 52,
      "..\\..\\node_modules\\react\\lib\\LinkedValueUtils.js": 53,
      "..\\..\\node_modules\\react\\lib\\ReactComponentEnvironment.js": 54,
      "..\\..\\node_modules\\react\\lib\\ReactErrorUtils.js": 55,
      "..\\..\\node_modules\\react\\lib\\ReactUpdateQueue.js": 56,
      "..\\..\\node_modules\\react\\lib\\createMicrosoftUnsafeLocalFunction.js": 57,
      "..\\..\\node_modules\\react\\lib\\getEventCharCode.js": 58,
      "..\\..\\node_modules\\react\\lib\\getEventModifierState.js": 59,
      "..\\..\\node_modules\\react\\lib\\getEventTarget.js": 60,
      "..\\..\\node_modules\\react\\lib\\isEventSupported.js": 61,
      "..\\..\\node_modules\\react\\lib\\shouldUpdateReactComponent.js": 62,
      "..\\..\\node_modules\\react\\lib\\validateDOMNesting.js": 63,
      "..\\..\\node_modules\\fbjs\\lib\\EventListener.js": 64,
      "..\\..\\node_modules\\fbjs\\lib\\focusNode.js": 65,
      "..\\..\\node_modules\\fbjs\\lib\\getActiveElement.js": 66,
      "..\\..\\node_modules\\fbjs\\lib\\shallowEqual.js": 67,
      "..\\..\\node_modules\\react\\lib\\CSSProperty.js": 68,
      "..\\..\\node_modules\\react\\lib\\CallbackQueue.js": 69,
      "..\\..\\node_modules\\react\\lib\\DOMPropertyOperations.js": 70,
      "..\\..\\node_modules\\react\\lib\\ReactComponentBrowserEnvironment.js": 71,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponentFlags.js": 72,
      "..\\..\\node_modules\\react\\lib\\ReactDOMSelect.js": 73,
      "..\\..\\node_modules\\react\\lib\\ReactEmptyComponent.js": 74,
      "..\\..\\node_modules\\react\\lib\\ReactFeatureFlags.js": 75,
      "..\\..\\node_modules\\react\\lib\\ReactHostComponent.js": 76,
      "..\\..\\node_modules\\react\\lib\\ReactInputSelection.js": 77,
      "..\\..\\node_modules\\react\\lib\\ReactMount.js": 78,
      "..\\..\\node_modules\\react\\lib\\ReactMultiChildUpdateTypes.js": 79,
      "..\\..\\node_modules\\react\\lib\\ReactNodeTypes.js": 80,
      "..\\..\\node_modules\\react\\lib\\ViewportMetrics.js": 81,
      "..\\..\\node_modules\\react\\lib\\accumulateInto.js": 82,
      "..\\..\\node_modules\\react\\lib\\forEachAccumulated.js": 83,
      "..\\..\\node_modules\\react\\lib\\getHostComponentFromComposite.js": 84,
      "..\\..\\node_modules\\react\\lib\\getTextContentAccessor.js": 85,
      "..\\..\\node_modules\\react\\lib\\instantiateReactComponent.js": 86,
      "..\\..\\node_modules\\react\\lib\\isTextInputElement.js": 87,
      "..\\..\\node_modules\\react\\lib\\setTextContent.js": 88,
      "..\\..\\node_modules\\fbjs\\lib\\camelize.js": 89,
      "..\\..\\node_modules\\fbjs\\lib\\camelizeStyleName.js": 90,
      "..\\..\\node_modules\\fbjs\\lib\\containsNode.js": 91,
      "..\\..\\node_modules\\fbjs\\lib\\createArrayFromMixed.js": 92,
      "..\\..\\node_modules\\fbjs\\lib\\createNodesFromMarkup.js": 93,
      "..\\..\\node_modules\\fbjs\\lib\\getMarkupWrap.js": 94,
      "..\\..\\node_modules\\fbjs\\lib\\getUnboundedScrollPosition.js": 95,
      "..\\..\\node_modules\\fbjs\\lib\\hyphenate.js": 96,
      "..\\..\\node_modules\\fbjs\\lib\\hyphenateStyleName.js": 97,
      "..\\..\\node_modules\\fbjs\\lib\\isNode.js": 98,
      "..\\..\\node_modules\\fbjs\\lib\\isTextNode.js": 99,
      "..\\..\\node_modules\\fbjs\\lib\\memoizeStringOnly.js": 100,
      "..\\..\\node_modules\\react\\lib\\AutoFocusUtils.js": 101,
      "..\\..\\node_modules\\react\\lib\\BeforeInputEventPlugin.js": 102,
      "..\\..\\node_modules\\react\\lib\\CSSPropertyOperations.js": 103,
      "..\\..\\node_modules\\react\\lib\\ChangeEventPlugin.js": 104,
      "..\\..\\node_modules\\react\\lib\\Danger.js": 105,
      "..\\..\\node_modules\\react\\lib\\DefaultEventPluginOrder.js": 106,
      "..\\..\\node_modules\\react\\lib\\EnterLeaveEventPlugin.js": 107,
      "..\\..\\node_modules\\react\\lib\\FallbackCompositionState.js": 108,
      "..\\..\\node_modules\\react\\lib\\HTMLDOMPropertyConfig.js": 109,
      "..\\..\\node_modules\\react\\lib\\ReactChildReconciler.js": 110,
      "..\\..\\node_modules\\react\\lib\\ReactCompositeComponent.js": 111,
      "..\\..\\node_modules\\react\\lib\\ReactDOM.js": 112,
      "..\\..\\node_modules\\react\\lib\\ReactDOMButton.js": 113,
      "..\\..\\node_modules\\react\\lib\\ReactDOMComponent.js": 114,
      "..\\..\\node_modules\\react\\lib\\ReactDOMContainerInfo.js": 115,
      "..\\..\\node_modules\\react\\lib\\ReactDOMEmptyComponent.js": 116,
      "..\\..\\node_modules\\react\\lib\\ReactDOMFeatureFlags.js": 117,
      "..\\..\\node_modules\\react\\lib\\ReactDOMIDOperations.js": 118,
      "..\\..\\node_modules\\react\\lib\\ReactDOMInput.js": 119,
      "..\\..\\node_modules\\react\\lib\\ReactDOMInstrumentation.js": 120,
      "..\\..\\node_modules\\react\\lib\\ReactDOMOption.js": 121,
      "..\\..\\node_modules\\react\\lib\\ReactDOMSelection.js": 122,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTextComponent.js": 123,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTextarea.js": 124,
      "..\\..\\node_modules\\react\\lib\\ReactDOMTreeTraversal.js": 125,
      "..\\..\\node_modules\\react\\lib\\ReactDefaultBatchingStrategy.js": 126,
      "..\\..\\node_modules\\react\\lib\\ReactDefaultInjection.js": 127,
      "..\\..\\node_modules\\react\\lib\\ReactEventEmitterMixin.js": 128,
      "..\\..\\node_modules\\react\\lib\\ReactEventListener.js": 129,
      "..\\..\\node_modules\\react\\lib\\ReactInjection.js": 130,
      "..\\..\\node_modules\\react\\lib\\ReactMarkupChecksum.js": 131,
      "..\\..\\node_modules\\react\\lib\\ReactMultiChild.js": 132,
      "..\\..\\node_modules\\react\\lib\\ReactOwner.js": 133,
      "..\\..\\node_modules\\react\\lib\\ReactReconcileTransaction.js": 134,
      "..\\..\\node_modules\\react\\lib\\ReactRef.js": 135,
      "..\\..\\node_modules\\react\\lib\\ReactServerRenderingTransaction.js": 136,
      "..\\..\\node_modules\\react\\lib\\ReactServerUpdateQueue.js": 137,
      "..\\..\\node_modules\\react\\lib\\SVGDOMPropertyConfig.js": 138,
      "..\\..\\node_modules\\react\\lib\\SelectEventPlugin.js": 139,
      "..\\..\\node_modules\\react\\lib\\SimpleEventPlugin.js": 140,
      "..\\..\\node_modules\\react\\lib\\SyntheticAnimationEvent.js": 141,
      "..\\..\\node_modules\\react\\lib\\SyntheticClipboardEvent.js": 142,
      "..\\..\\node_modules\\react\\lib\\SyntheticCompositionEvent.js": 143,
      "..\\..\\node_modules\\react\\lib\\SyntheticDragEvent.js": 144,
      "..\\..\\node_modules\\react\\lib\\SyntheticFocusEvent.js": 145,
      "..\\..\\node_modules\\react\\lib\\SyntheticInputEvent.js": 146,
      "..\\..\\node_modules\\react\\lib\\SyntheticKeyboardEvent.js": 147,
      "..\\..\\node_modules\\react\\lib\\SyntheticTouchEvent.js": 148,
      "..\\..\\node_modules\\react\\lib\\SyntheticTransitionEvent.js": 149,
      "..\\..\\node_modules\\react\\lib\\SyntheticWheelEvent.js": 150,
      "..\\..\\node_modules\\react\\lib\\adler32.js": 151,
      "..\\..\\node_modules\\react\\lib\\checkReactTypeSpec.js": 152,
      "..\\..\\node_modules\\react\\lib\\dangerousStyleValue.js": 153,
      "..\\..\\node_modules\\react\\lib\\findDOMNode.js": 154,
      "..\\..\\node_modules\\react\\lib\\flattenChildren.js": 155,
      "..\\..\\node_modules\\react\\lib\\getEventKey.js": 156,
      "..\\..\\node_modules\\react\\lib\\getNodeForCharacterOffset.js": 157,
      "..\\..\\node_modules\\react\\lib\\getVendorPrefixedEventName.js": 158,
      "..\\..\\node_modules\\react\\lib\\quoteAttributeValueForBrowser.js": 159,
      "..\\..\\node_modules\\react\\lib\\renderSubtreeIntoContainer.js": 160
    }
  },
  "nextFreeChunkId": 14,
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:4": 0,
      "example.js:0/0:2": 1,
      "example.js:0/0:9": 2,
      "example.js:0/0:10": 3,
      "example.js:0/0:1": 4,
      "example.js:0/0:3": 5,
      "example.js:0/0:0": 6,
      "example.js:0/0:5": 7,
      "example.js:0/0:6": 8,
      "example.js:0/0:8": 9,
      "example.js:0/0:7": 10
    }
  },
  "aggressiveSplits": [
    {
      "modules": [
        "..\\..\\node_modules\\fbjs\\lib\\EventListener.js",
        "..\\..\\node_modules\\fbjs\\lib\\ExecutionEnvironment.js",
        "..\\..\\node_modules\\fbjs\\lib\\camelize.js",
        "..\\..\\node_modules\\fbjs\\lib\\camelizeStyleName.js",
        "..\\..\\node_modules\\fbjs\\lib\\containsNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\createArrayFromMixed.js",
        "..\\..\\node_modules\\fbjs\\lib\\createNodesFromMarkup.js",
        "..\\..\\node_modules\\fbjs\\lib\\focusNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\getActiveElement.js",
        "..\\..\\node_modules\\fbjs\\lib\\getMarkupWrap.js",
        "..\\..\\node_modules\\fbjs\\lib\\getUnboundedScrollPosition.js",
        "..\\..\\node_modules\\fbjs\\lib\\hyphenate.js",
        "..\\..\\node_modules\\fbjs\\lib\\hyphenateStyleName.js",
        "..\\..\\node_modules\\fbjs\\lib\\isNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\isTextNode.js",
        "..\\..\\node_modules\\fbjs\\lib\\memoizeStringOnly.js",
        "..\\..\\node_modules\\fbjs\\lib\\shallowEqual.js",
        "..\\..\\node_modules\\react-dom\\index.js",
        "..\\..\\node_modules\\react\\lib\\AutoFocusUtils.js",
        "..\\..\\node_modules\\react\\lib\\BeforeInputEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\CSSProperty.js",
        "..\\..\\node_modules\\react\\lib\\CSSPropertyOperations.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponentFlags.js"
      ],
      "hash": "42f9c68ce2db0b310159cb3440d73c99",
      "id": 0
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\escapeTextContentForBrowser.js",
        "..\\..\\node_modules\\react\\lib\\flattenChildren.js",
        "..\\..\\node_modules\\react\\lib\\forEachAccumulated.js",
        "..\\..\\node_modules\\react\\lib\\getEventCharCode.js",
        "..\\..\\node_modules\\react\\lib\\getEventKey.js",
        "..\\..\\node_modules\\react\\lib\\getEventModifierState.js",
        "..\\..\\node_modules\\react\\lib\\getEventTarget.js",
        "..\\..\\node_modules\\react\\lib\\getHostComponentFromComposite.js",
        "..\\..\\node_modules\\react\\lib\\getNodeForCharacterOffset.js",
        "..\\..\\node_modules\\react\\lib\\getTextContentAccessor.js",
        "..\\..\\node_modules\\react\\lib\\getVendorPrefixedEventName.js",
        "..\\..\\node_modules\\react\\lib\\instantiateReactComponent.js",
        "..\\..\\node_modules\\react\\lib\\isEventSupported.js",
        "..\\..\\node_modules\\react\\lib\\isTextInputElement.js",
        "..\\..\\node_modules\\react\\lib\\quoteAttributeValueForBrowser.js",
        "..\\..\\node_modules\\react\\lib\\setInnerHTML.js",
        "..\\..\\node_modules\\react\\lib\\setTextContent.js",
        "..\\..\\node_modules\\react\\lib\\shouldUpdateReactComponent.js",
        "..\\..\\node_modules\\react\\lib\\validateDOMNesting.js"
      ],
      "hash": "195c9326275620b0e9c23a860186e769",
      "id": 1
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactDOMTextarea.js",
        "..\\..\\node_modules\\react\\lib\\ReactDefaultBatchingStrategy.js",
        "..\\..\\node_modules\\react\\lib\\ReactDefaultInjection.js",
        "..\\..\\node_modules\\react\\lib\\ReactErrorUtils.js",
        "..\\..\\node_modules\\react\\lib\\ReactEventListener.js",
        "..\\..\\node_modules\\react\\lib\\ReactFeatureFlags.js",
        "..\\..\\node_modules\\react\\lib\\ReactHostComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactInjection.js",
        "..\\..\\node_modules\\react\\lib\\ReactInputSelection.js",
        "..\\..\\node_modules\\react\\lib\\ReactInstanceMap.js",
        "..\\..\\node_modules\\react\\lib\\ReactMarkupChecksum.js",
        "..\\..\\node_modules\\react\\lib\\ReactMultiChild.js",
        "..\\..\\node_modules\\react\\lib\\ReactMultiChildUpdateTypes.js",
        "..\\..\\node_modules\\react\\lib\\ReactNodeTypes.js",
        "..\\..\\node_modules\\react\\lib\\ReactRef.js"
      ],
      "hash": "c24df64c9d1be3f14bed73ddf6ddad6f",
      "id": 2
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\SimpleEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticMouseEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticTouchEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticTransitionEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticUIEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticWheelEvent.js",
        "..\\..\\node_modules\\react\\lib\\Transaction.js",
        "..\\..\\node_modules\\react\\lib\\accumulateInto.js",
        "..\\..\\node_modules\\react\\lib\\adler32.js",
        "..\\..\\node_modules\\react\\lib\\checkReactTypeSpec.js",
        "..\\..\\node_modules\\react\\lib\\createMicrosoftUnsafeLocalFunction.js",
        "..\\..\\node_modules\\react\\lib\\dangerousStyleValue.js",
        "..\\..\\node_modules\\react\\lib\\findDOMNode.js"
      ],
      "hash": "c9045e231c8edbc788ae3d874cdd124f",
      "id": 3
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactBrowserEventEmitter.js",
        "..\\..\\node_modules\\react\\lib\\ReactChildReconciler.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOM.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponentTree.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMContainerInfo.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMEmptyComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMFeatureFlags.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMIDOperations.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMInput.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMInstrumentation.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMOption.js",
        "..\\..\\node_modules\\react\\lib\\ReactEmptyComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactInstrumentation.js"
      ],
      "hash": "cbb6123321cf7cb9fde958c5f8d62ae0",
      "id": 4
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactUpdateQueue.js",
        "..\\..\\node_modules\\react\\lib\\ReactUpdates.js",
        "..\\..\\node_modules\\react\\lib\\SVGDOMPropertyConfig.js",
        "..\\..\\node_modules\\react\\lib\\SelectEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticClipboardEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticCompositionEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticDragEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticFocusEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticInputEvent.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticKeyboardEvent.js"
      ],
      "hash": "a2919251072756ed702d2c82c808f8e7",
      "id": 5
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\EventConstants.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginHub.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginRegistry.js",
        "..\\..\\node_modules\\react\\lib\\EventPluginUtils.js",
        "..\\..\\node_modules\\react\\lib\\EventPropagators.js",
        "..\\..\\node_modules\\react\\lib\\FallbackCompositionState.js",
        "..\\..\\node_modules\\react\\lib\\HTMLDOMPropertyConfig.js",
        "..\\..\\node_modules\\react\\lib\\LinkedValueUtils.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponentBrowserEnvironment.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponentEnvironment.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMButton.js"
      ],
      "hash": "71a18b9485bf6fa9a2d0a481113e6ed1",
      "id": 6
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\CallbackQueue.js",
        "..\\..\\node_modules\\react\\lib\\ChangeEventPlugin.js",
        "..\\..\\node_modules\\react\\lib\\DOMChildrenOperations.js",
        "..\\..\\node_modules\\react\\lib\\DOMLazyTree.js",
        "..\\..\\node_modules\\react\\lib\\DOMNamespaces.js",
        "..\\..\\node_modules\\react\\lib\\DOMProperty.js",
        "..\\..\\node_modules\\react\\lib\\DOMPropertyOperations.js",
        "..\\..\\node_modules\\react\\lib\\Danger.js",
        "..\\..\\node_modules\\react\\lib\\DefaultEventPluginOrder.js",
        "..\\..\\node_modules\\react\\lib\\DisabledInputUtils.js",
        "..\\..\\node_modules\\react\\lib\\EnterLeaveEventPlugin.js"
      ],
      "hash": "8fcb4106a762189b462e5c642fa6085b",
      "id": 7
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactMount.js",
        "..\\..\\node_modules\\react\\lib\\ReactOwner.js",
        "..\\..\\node_modules\\react\\lib\\ReactReconcileTransaction.js",
        "..\\..\\node_modules\\react\\lib\\ReactReconciler.js",
        "..\\..\\node_modules\\react\\lib\\ReactServerRenderingTransaction.js",
        "..\\..\\node_modules\\react\\lib\\ReactServerUpdateQueue.js",
        "..\\..\\node_modules\\react\\lib\\SyntheticAnimationEvent.js",
        "..\\..\\node_modules\\react\\lib\\ViewportMetrics.js"
      ],
      "hash": "9ae8368950c8db52673871ee3794dfc1",
      "id": 8
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactDOMComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMTextComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMTreeTraversal.js",
        "..\\..\\node_modules\\react\\lib\\ReactEventEmitterMixin.js"
      ],
      "hash": "d360e87fdf3111b702b686a22428e843",
      "id": 9
    },
    {
      "modules": [
        "..\\..\\node_modules\\react\\lib\\ReactCompositeComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMSelect.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMSelection.js",
        "..\\..\\node_modules\\react\\lib\\renderSubtreeIntoContainer.js"
      ],
      "hash": "cc545b839be6a4ff018fafbbe3543f65",
      "id": 10
    },
    {
      "modules": [
        "..\\..\\node_modules\\fbjs\\lib\\emptyFunction.js",
        "..\\..\\node_modules\\fbjs\\lib\\emptyObject.js",
        "..\\..\\node_modules\\fbjs\\lib\\invariant.js",
        "..\\..\\node_modules\\fbjs\\lib\\keyMirror.js",
        "..\\..\\node_modules\\fbjs\\lib\\keyOf.js",
        "..\\..\\node_modules\\fbjs\\lib\\mapObject.js",
        "..\\..\\node_modules\\fbjs\\lib\\warning.js",
        "..\\..\\node_modules\\object-assign\\index.js",
        "..\\..\\node_modules\\react\\lib\\KeyEscapeUtils.js",
        "..\\..\\node_modules\\react\\lib\\PooledClass.js",
        "..\\..\\node_modules\\react\\lib\\React.js",
        "..\\..\\node_modules\\react\\lib\\ReactChildren.js",
        "..\\..\\node_modules\\react\\lib\\ReactComponent.js",
        "..\\..\\node_modules\\react\\lib\\ReactCurrentOwner.js",
        "..\\..\\node_modules\\react\\lib\\ReactDOMFactories.js",
        "..\\..\\node_modules\\react\\lib\\ReactElement.js",
        "..\\..\\node_modules\\react\\lib\\ReactNoopUpdateQueue.js",
        "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocationNames.js",
        "..\\..\\node_modules\\react\\lib\\ReactPropTypeLocations.js",
        "..\\..\\node_modules\\react\\react.js"
      ],
      "hash": "ae79591633a90119353790ff634e01a5",
      "id": 11
    }
  ]
}
```
