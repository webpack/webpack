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
	// mode: "development || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
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

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                  Asset      Size  Chunks             Chunk Names
1d1f50c6f480a313a283.js  52.9 KiB       7  [emitted]  
650a1f5b6bbd5e2a0bcb.js  36.5 KiB       0  [emitted]  
85f47c3abb26198f77a8.js  59.9 KiB       2  [emitted]  
de45e35c6080cc33435c.js  31.6 KiB       3  [emitted]  
b9d30d332886e3897e04.js  56.1 KiB       4  [emitted]  
091d7e57346e564d3d09.js  52.4 KiB       5  [emitted]  
525a050e7b27998ce47b.js  51.8 KiB       6  [emitted]  
ad733bf1033fc5a7a830.js  32.3 KiB       1  [emitted]  
46af055d8fc77c1333fd.js  49.8 KiB       8  [emitted]  
d5f1ea3a0710998c9d82.js  50.9 KiB       9  [emitted]  
d12e724ddfa623596d6a.js  54.2 KiB      10  [emitted]  
6cbad41d6996fe8e07a5.js  51.7 KiB      11  [emitted]  
0bb84ee671fc256e158e.js  51.2 KiB      12  [emitted]  
c8536008639de2173e51.js  58.2 KiB      13  [emitted]  
763fbc691b4fe33d506e.js    22 KiB      14  [emitted]  
Entrypoint main = 85f47c3abb26198f77a8.js de45e35c6080cc33435c.js 650a1f5b6bbd5e2a0bcb.js
chunk    {0} 650a1f5b6bbd5e2a0bcb.js 32.4 KiB [initial] [rendered]
    > aggressive-splitted main [0] ./example.js 
    [0] ./example.js 44 bytes {0} [built]
     + 11 hidden modules
chunk    {1} ad733bf1033fc5a7a830.js 31.4 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    3 modules
chunk    {2} 85f47c3abb26198f77a8.js 48.8 KiB [entry] [rendered] [recorded]
    > aggressive-splitted main [0] ./example.js 
    16 modules
chunk    {3} de45e35c6080cc33435c.js 30.5 KiB [initial] [rendered] [recorded]
    > aggressive-splitted main [0] ./example.js 
    3 modules
chunk    {4} b9d30d332886e3897e04.js 48.7 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    24 modules
chunk    {5} 091d7e57346e564d3d09.js 48.8 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    11 modules
chunk    {6} 525a050e7b27998ce47b.js 48.6 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    10 modules
chunk    {7} 1d1f50c6f480a313a283.js 48.7 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    11 modules
chunk    {8} 46af055d8fc77c1333fd.js 48.8 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    6 modules
chunk    {9} d5f1ea3a0710998c9d82.js 48.7 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    6 modules
chunk   {10} d12e724ddfa623596d6a.js 48.7 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    15 modules
chunk   {11} 6cbad41d6996fe8e07a5.js 48.8 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    9 modules
chunk   {12} 0bb84ee671fc256e158e.js 48.6 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    7 modules
chunk   {13} c8536008639de2173e51.js 48.5 KiB {0} {2} {3} [rendered] [recorded]
    > aggressive-splitted [0] ./example.js 2:0-22
    28 modules
chunk   {14} 763fbc691b4fe33d506e.js 18.9 KiB {0} {2} {3} [rendered]
    > aggressive-splitted [0] ./example.js 2:0-22
    9 modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                  Asset      Size  Chunks             Chunk Names
39f63970b3a505be3348.js  10.6 KiB       7  [emitted]  
ae85856cebfcdd8c297c.js  4.88 KiB       0  [emitted]  
39b30b6e92b9a23bbe4d.js  15.1 KiB       2  [emitted]  
1eaba1ccd9861309a585.js  7.49 KiB       3  [emitted]  
46dbd7b5ea65ed2c7493.js  10.8 KiB       4  [emitted]  
1b86f4a2bde4e55b9437.js  12.5 KiB       5  [emitted]  
12df97cbb03e8f3fbf12.js  11.1 KiB       6  [emitted]  
b4ceaf41eafb58de0ffb.js  8.75 KiB       1  [emitted]  
cb73f4cb70c06c65b248.js  12.1 KiB       8  [emitted]  
4ec9445e60b5516c0459.js  9.93 KiB       9  [emitted]  
53cef345d9ccd6bb3876.js    13 KiB      10  [emitted]  
c5b86ebb82485218af01.js  4.99 KiB      11  [emitted]  
0309b4e1ec5aa2f66403.js  7.02 KiB      12  [emitted]  
4e1c37d40514df5cc50e.js  10.2 KiB      13  [emitted]  
0b3c96677d32cb9cb074.js  5.91 KiB      14  [emitted]  
Entrypoint main = 4e1c37d40514df5cc50e.js 0309b4e1ec5aa2f66403.js 0b3c96677d32cb9cb074.js
chunk    {0} ae85856cebfcdd8c297c.js 18.9 KiB {12} {13} {14} [rendered]
    > aggressive-splitted [30] ./example.js 2:0-22
    9 modules
chunk    {1} b4ceaf41eafb58de0ffb.js 48.5 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    28 modules
chunk    {2} 39b30b6e92b9a23bbe4d.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    7 modules
chunk    {3} 1eaba1ccd9861309a585.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    9 modules
chunk    {4} 46dbd7b5ea65ed2c7493.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    15 modules
chunk    {5} 1b86f4a2bde4e55b9437.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    6 modules
chunk    {6} 12df97cbb03e8f3fbf12.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    6 modules
chunk    {7} 39f63970b3a505be3348.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    11 modules
chunk    {8} cb73f4cb70c06c65b248.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    10 modules
chunk    {9} 4ec9445e60b5516c0459.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    11 modules
chunk   {10} 53cef345d9ccd6bb3876.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    24 modules
chunk   {11} c5b86ebb82485218af01.js 31.4 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
    3 modules
chunk   {12} 0309b4e1ec5aa2f66403.js 30.5 KiB [initial] [rendered] [recorded]
    > aggressive-splitted main [30] ./example.js 
    3 modules
chunk   {13} 4e1c37d40514df5cc50e.js 48.8 KiB [entry] [rendered] [recorded]
    > aggressive-splitted main [30] ./example.js 
    16 modules
chunk   {14} 0b3c96677d32cb9cb074.js 32.4 KiB [initial] [rendered]
    > aggressive-splitted main [30] ./example.js 
   [30] ./example.js 44 bytes {14} [built]
     + 11 hidden modules
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "example.js": 0,
      "../../node_modules/react/react.js": 1,
      "../../node_modules/react/lib/React.js": 2,
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/react/lib/ReactBaseClasses.js": 4,
      "../../node_modules/react/lib/reactProdInvariant.js": 5,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 6,
      "../../node_modules/fbjs/lib/warning.js": 7,
      "../../node_modules/fbjs/lib/emptyFunction.js": 8,
      "../../node_modules/react/lib/canDefineProperty.js": 9,
      "../../node_modules/fbjs/lib/emptyObject.js": 10,
      "../../node_modules/fbjs/lib/invariant.js": 11,
      "../../node_modules/react/lib/lowPriorityWarning.js": 12,
      "../../node_modules/react/lib/ReactChildren.js": 13,
      "../../node_modules/react/lib/PooledClass.js": 14,
      "../../node_modules/react/lib/ReactElement.js": 15,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 16,
      "../../node_modules/react/lib/ReactElementSymbol.js": 17,
      "../../node_modules/react/lib/traverseAllChildren.js": 18,
      "../../node_modules/react/lib/getIteratorFn.js": 19,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 20,
      "../../node_modules/react/lib/ReactDOMFactories.js": 21,
      "../../node_modules/react/lib/ReactPropTypes.js": 22,
      "../../node_modules/prop-types/factory.js": 23,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 24,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 25,
      "../../node_modules/prop-types/checkPropTypes.js": 26,
      "../../node_modules/react/lib/ReactVersion.js": 27,
      "../../node_modules/react/lib/createClass.js": 28,
      "../../node_modules/create-react-class/factory.js": 29,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react-dom/index.js": 31,
      "../../node_modules/react-dom/lib/ReactDOM.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 34,
      "../../node_modules/react-dom/lib/DOMProperty.js": 35,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 36,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 37,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 38,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 39,
      "../../node_modules/react-dom/lib/EventPropagators.js": 40,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 41,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 42,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 43,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 44,
      "../../node_modules/react-dom/lib/accumulateInto.js": 45,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 46,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 47,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 48,
      "../../node_modules/react-dom/lib/PooledClass.js": 49,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 50,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 51,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 52,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 53,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 54,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 55,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 56,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 57,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 58,
      "../../node_modules/react-dom/lib/ReactRef.js": 59,
      "../../node_modules/react-dom/lib/ReactOwner.js": 60,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 61,
      "../../node_modules/react-dom/lib/Transaction.js": 62,
      "../../node_modules/react-dom/lib/inputValueTracking.js": 63,
      "../../node_modules/react-dom/lib/getEventTarget.js": 64,
      "../../node_modules/react-dom/lib/isEventSupported.js": 65,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 66,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 67,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 68,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 69,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 70,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 71,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 72,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 73,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 74,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 75,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 76,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 77,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 78,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 79,
      "../../node_modules/react-dom/lib/setTextContent.js": 80,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 81,
      "../../node_modules/react-dom/lib/Danger.js": 82,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 83,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 84,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 85,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 86,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 87,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 88,
      "../../node_modules/fbjs/lib/focusNode.js": 89,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 90,
      "../../node_modules/react-dom/lib/CSSProperty.js": 91,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 92,
      "../../node_modules/fbjs/lib/camelize.js": 93,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 94,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 95,
      "../../node_modules/fbjs/lib/hyphenate.js": 96,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 97,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 98,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 99,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 100,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 101,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 102,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 103,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 104,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 105,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 106,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 107,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 108,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 109,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 110,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 111,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 112,
      "../../node_modules/process/browser.js": 113,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 114,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 115,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 116,
      "../../node_modules/fbjs/lib/shallowEqual.js": 117,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 118,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 119,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 120,
      "../../node_modules/react/lib/getNextDebugID.js": 121,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 122,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 123,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 124,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 125,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 126,
      "../../node_modules/react-dom/lib/flattenChildren.js": 127,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 128,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 129,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 130,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 131,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 132,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 133,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 134,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 135,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 136,
      "../../node_modules/fbjs/lib/EventListener.js": 137,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 138,
      "../../node_modules/react-dom/lib/ReactInjection.js": 139,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 140,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 141,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 142,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 143,
      "../../node_modules/fbjs/lib/containsNode.js": 144,
      "../../node_modules/fbjs/lib/isTextNode.js": 145,
      "../../node_modules/fbjs/lib/isNode.js": 146,
      "../../node_modules/fbjs/lib/getActiveElement.js": 147,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 148,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 149,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 150,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 151,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 152,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 153,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 154,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 155,
      "../../node_modules/react-dom/lib/getEventKey.js": 156,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 157,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 158,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 159,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 160,
      "../../node_modules/react-dom/lib/ReactMount.js": 161,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 162,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 163,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 164,
      "../../node_modules/react-dom/lib/adler32.js": 165,
      "../../node_modules/react-dom/lib/ReactVersion.js": 166,
      "../../node_modules/react-dom/lib/findDOMNode.js": 167,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 168,
      "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js": 169
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14,
      "15": 15,
      "16": 16,
      "17": 17,
      "18": 18,
      "19": 19,
      "20": 20,
      "21": 21,
      "22": 22,
      "23": 23,
      "24": 24,
      "25": 25,
      "26": 26,
      "27": 27,
      "28": 28,
      "29": 29,
      "30": 30,
      "31": 31,
      "32": 32,
      "33": 33,
      "34": 34,
      "35": 35,
      "36": 36,
      "37": 37,
      "38": 38,
      "39": 39,
      "40": 40,
      "41": 41,
      "42": 42,
      "43": 43,
      "44": 44,
      "45": 45,
      "46": 46,
      "47": 47,
      "48": 48,
      "49": 49,
      "50": 50,
      "51": 51,
      "52": 52,
      "53": 53,
      "54": 54,
      "55": 55,
      "56": 56,
      "57": 57,
      "58": 58,
      "59": 59,
      "60": 60,
      "61": 61,
      "62": 62,
      "63": 63,
      "64": 64,
      "65": 65,
      "66": 66,
      "67": 67,
      "68": 68,
      "69": 69,
      "70": 70,
      "71": 71,
      "72": 72,
      "73": 73,
      "74": 74,
      "75": 75,
      "76": 76,
      "77": 77,
      "78": 78,
      "79": 79,
      "80": 80,
      "81": 81,
      "82": 82,
      "83": 83,
      "84": 84,
      "85": 85,
      "86": 86,
      "87": 87,
      "88": 88,
      "89": 89,
      "90": 90,
      "91": 91,
      "92": 92,
      "93": 93,
      "94": 94,
      "95": 95,
      "96": 96,
      "97": 97,
      "98": 98,
      "99": 99,
      "100": 100,
      "101": 101,
      "102": 102,
      "103": 103,
      "104": 104,
      "105": 105,
      "106": 106,
      "107": 107,
      "108": 108,
      "109": 109,
      "110": 110,
      "111": 111,
      "112": 112,
      "113": 113,
      "114": 114,
      "115": 115,
      "116": 116,
      "117": 117,
      "118": 118,
      "119": 119,
      "120": 120,
      "121": 121,
      "122": 122,
      "123": 123,
      "124": 124,
      "125": 125,
      "126": 126,
      "127": 127,
      "128": 128,
      "129": 129,
      "130": 130,
      "131": 131,
      "132": 132,
      "133": 133,
      "134": 134,
      "135": 135,
      "136": 136,
      "137": 137,
      "138": 138,
      "139": 139,
      "140": 140,
      "141": 141,
      "142": 142,
      "143": 143,
      "144": 144,
      "145": 145,
      "146": 146,
      "147": 147,
      "148": 148,
      "149": 149,
      "150": 150,
      "151": 151,
      "152": 152,
      "153": 153,
      "154": 154,
      "155": 155,
      "156": 156,
      "157": 157,
      "158": 158,
      "159": 159,
      "160": 160,
      "161": 161,
      "162": 162,
      "163": 163,
      "164": 164,
      "165": 165,
      "166": 166,
      "167": 167,
      "168": 168,
      "169": 169
    }
  },
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:11": 1,
      "example.js:0/0:1": 4,
      "example.js:0/0:4": 5,
      "example.js:0/0:5": 6,
      "example.js:0/0:3": 7,
      "example.js:0/0:10": 8,
      "example.js:0/0:9": 9,
      "example.js:0/0:2": 10,
      "example.js:0/0:7": 11,
      "example.js:0/0:8": 12,
      "example.js:0/0:0": 13,
      "example.js:0/0:6": 14
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14
    }
  },
  "aggressiveSplits": [
    {
      "modules": [
        "../../node_modules/react-dom/lib/traverseAllChildren.js",
        "../../node_modules/react/lib/ReactComponentTreeHook.js",
        "../../node_modules/react-dom/lib/validateDOMNesting.js"
      ],
      "hash": "ad733bf1033fc5a7a830729967f1aa3d",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/react/lib/React.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/ReactElementSymbol.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/ReactPropTypes.js",
        "../../node_modules/prop-types/factory.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/react/lib/ReactVersion.js",
        "../../node_modules/create-react-class/factory.js"
      ],
      "hash": "85f47c3abb26198f77a84b0d186d3d6f",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactBaseClasses.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/prop-types/factoryWithTypeCheckers.js"
      ],
      "hash": "de45e35c6080cc33435c495b06d97616",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react-dom/index.js",
        "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js",
        "../../node_modules/fbjs/lib/ExecutionEnvironment.js",
        "../../node_modules/react-dom/lib/CallbackQueue.js",
        "../../node_modules/fbjs/lib/createNodesFromMarkup.js",
        "../../node_modules/fbjs/lib/createArrayFromMixed.js",
        "../../node_modules/fbjs/lib/getMarkupWrap.js",
        "../../node_modules/react-dom/lib/AutoFocusUtils.js",
        "../../node_modules/fbjs/lib/focusNode.js",
        "../../node_modules/react-dom/lib/CSSProperty.js",
        "../../node_modules/fbjs/lib/camelizeStyleName.js",
        "../../node_modules/fbjs/lib/camelize.js",
        "../../node_modules/fbjs/lib/hyphenateStyleName.js",
        "../../node_modules/fbjs/lib/hyphenate.js",
        "../../node_modules/fbjs/lib/memoizeStringOnly.js",
        "../../node_modules/process/browser.js",
        "../../node_modules/fbjs/lib/shallowEqual.js",
        "../../node_modules/fbjs/lib/EventListener.js",
        "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js",
        "../../node_modules/fbjs/lib/containsNode.js",
        "../../node_modules/fbjs/lib/isTextNode.js",
        "../../node_modules/fbjs/lib/isNode.js",
        "../../node_modules/fbjs/lib/getActiveElement.js"
      ],
      "hash": "b9d30d332886e3897e04ddeadec79c0c",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/DOMProperty.js",
        "../../node_modules/react-dom/lib/ChangeEventPlugin.js",
        "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js",
        "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react-dom/lib/DOMChildrenOperations.js",
        "../../node_modules/react-dom/lib/DOMLazyTree.js",
        "../../node_modules/react-dom/lib/DOMNamespaces.js",
        "../../node_modules/react-dom/lib/Danger.js",
        "../../node_modules/react-dom/lib/CSSPropertyOperations.js",
        "../../node_modules/react-dom/lib/DOMPropertyOperations.js",
        "../../node_modules/react-dom/lib/KeyEscapeUtils.js"
      ],
      "hash": "091d7e57346e564d3d09367243e71f29",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js",
        "../../node_modules/react-dom/lib/EventPropagators.js",
        "../../node_modules/react-dom/lib/EventPluginHub.js",
        "../../node_modules/react-dom/lib/EventPluginRegistry.js",
        "../../node_modules/react-dom/lib/EventPluginUtils.js",
        "../../node_modules/react-dom/lib/FallbackCompositionState.js",
        "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/LinkedValueUtils.js",
        "../../node_modules/react-dom/lib/ReactComponentEnvironment.js"
      ],
      "hash": "525a050e7b27998ce47bd47dc8a70b3d",
      "id": 6
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOM.js",
        "../../node_modules/react-dom/lib/ReactDOMComponentTree.js",
        "../../node_modules/react-dom/lib/PooledClass.js",
        "../../node_modules/react-dom/lib/ReactDOMIDOperations.js",
        "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react-dom/lib/ReactDOMInput.js",
        "../../node_modules/react-dom/lib/ReactPropTypesSecret.js",
        "../../node_modules/react-dom/lib/ReactChildReconciler.js",
        "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js"
      ],
      "hash": "1d1f50c6f480a313a28328a53aef55ca",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMOption.js",
        "../../node_modules/react-dom/lib/ReactDOMSelect.js",
        "../../node_modules/react-dom/lib/ReactCompositeComponent.js",
        "../../node_modules/react-dom/lib/ReactElementSymbol.js",
        "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js"
      ],
      "hash": "46af055d8fc77c1333fd0dc173e0e0d8",
      "id": 8
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponent.js",
        "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react-dom/lib/ReactEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js",
        "../../node_modules/react-dom/lib/ReactInjection.js",
        "../../node_modules/react-dom/lib/ReactDOMSelection.js"
      ],
      "hash": "d5f1ea3a0710998c9d82be964c021396",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDefaultInjection.js",
        "../../node_modules/react-dom/lib/ReactErrorUtils.js",
        "../../node_modules/react-dom/lib/ReactRef.js",
        "../../node_modules/react-dom/lib/ReactInstrumentation.js",
        "../../node_modules/react-dom/lib/ReactDOMTextarea.js",
        "../../node_modules/react-dom/lib/ReactMultiChild.js",
        "../../node_modules/react-dom/lib/ReactInstanceMap.js",
        "../../node_modules/react-dom/lib/ReactNodeTypes.js",
        "../../node_modules/react-dom/lib/ReactHostComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMTextComponent.js",
        "../../node_modules/react-dom/lib/ReactEventListener.js",
        "../../node_modules/react-dom/lib/ReactInputSelection.js",
        "../../node_modules/react-dom/lib/ReactMarkupChecksum.js",
        "../../node_modules/react-dom/lib/ReactVersion.js",
        "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js"
      ],
      "hash": "d12e724ddfa623596d6a24f7035e30be",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js",
        "../../node_modules/react-dom/lib/ReactReconciler.js",
        "../../node_modules/react-dom/lib/ReactOwner.js",
        "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react-dom/lib/ReactReconcileTransaction.js",
        "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js",
        "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js",
        "../../node_modules/react-dom/lib/ReactMount.js"
      ],
      "hash": "6cbad41d6996fe8e07a5537ce7e33865",
      "id": 11
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/SyntheticEvent.js",
        "../../node_modules/react-dom/lib/ReactUpdates.js",
        "../../node_modules/react-dom/lib/ReactUpdateQueue.js",
        "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/SelectEventPlugin.js",
        "../../node_modules/react-dom/lib/SimpleEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticDragEvent.js"
      ],
      "hash": "0bb84ee671fc256e158ebb155797950a",
      "id": 12
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/accumulateInto.js",
        "../../node_modules/react-dom/lib/forEachAccumulated.js",
        "../../node_modules/react-dom/lib/getTextContentAccessor.js",
        "../../node_modules/react-dom/lib/SyntheticInputEvent.js",
        "../../node_modules/react-dom/lib/Transaction.js",
        "../../node_modules/react-dom/lib/getEventTarget.js",
        "../../node_modules/react-dom/lib/isEventSupported.js",
        "../../node_modules/react-dom/lib/SyntheticMouseEvent.js",
        "../../node_modules/react-dom/lib/SyntheticUIEvent.js",
        "../../node_modules/react-dom/lib/ViewportMetrics.js",
        "../../node_modules/react-dom/lib/getEventModifierState.js",
        "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react-dom/lib/dangerousStyleValue.js",
        "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js",
        "../../node_modules/react-dom/lib/getIteratorFn.js",
        "../../node_modules/react-dom/lib/flattenChildren.js",
        "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react-dom/lib/SyntheticFocusEvent.js",
        "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js",
        "../../node_modules/react-dom/lib/getEventCharCode.js",
        "../../node_modules/react-dom/lib/getEventKey.js",
        "../../node_modules/react-dom/lib/SyntheticTouchEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticWheelEvent.js",
        "../../node_modules/react-dom/lib/adler32.js",
        "../../node_modules/react-dom/lib/findDOMNode.js",
        "../../node_modules/react-dom/lib/getHostComponentFromComposite.js"
      ],
      "hash": "c8536008639de2173e512fbe0763df49",
      "id": 13
    }
  ]
}
```
