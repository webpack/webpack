This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server, otherwise there is an overhead for the increased number of requests.

AggressiveSplittingPlugin splits every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. It groups modules together by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

AggressiveSplittingPlugin records its splitting in the webpack records. When it is next run, it tries to use the last recorded splitting. Since changes to application code between one run and the next are usually in only a few modules (or just one), re-using the old splittings (and chunks, which are probably still in the client's cache), is highly advantageous.

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating many records of small chunks for every change.

If a module changes, its chunks are declared to be invalid, and are put back into the module pool. New chunks are created from all modules in the pool.

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
		path: path.join(__dirname, "dist"),
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
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.29.0
                  Asset      Size  Chunks             Chunk Names
0a0f27dcdc8ba1a1b4b5.js  36.8 KiB       4  [emitted]  
1720e04fd18f5f8dcd95.js  52.1 KiB       3  [emitted]  
1c33e7c9231d1b0dac91.js    43 KiB      13  [emitted]  
3b424e33566ed6d0942c.js  54.5 KiB       9  [emitted]  
554d0aaa9405a41a39c5.js  51.3 KiB       6  [emitted]  
5df3f9a16253c400b355.js    46 KiB      12  [emitted]  
66096f7964d21fc670d6.js  41.7 KiB      11  [emitted]  
82f356175ebb96ba71e7.js  37.6 KiB       7  [emitted]  
97afb6c3e6e959a31dd8.js  44.7 KiB      10  [emitted]  
b151fc0a66a1fcdce12e.js  32.4 KiB       2  [emitted]  
b54f0f53a39d17d1c444.js    43 KiB       5  [emitted]  
c7a9c7d3afbcccecff17.js  51.9 KiB       8  [emitted]  
d2dbaa46a12dabb4476a.js  12.6 KiB      14  [emitted]  
d9d10902e1a11e8edd0b.js  36.1 KiB       0  [emitted]  
deacfa20b80b9a83d92f.js  43.7 KiB       1  [emitted]  
Entrypoint main = b151fc0a66a1fcdce12e.js deacfa20b80b9a83d92f.js d9d10902e1a11e8edd0b.js
chunk    {0} d9d10902e1a11e8edd0b.js 28.3 KiB ={1}= ={2}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [entry] [rendered]
    > ./example main
 [0] ./example.js 42 bytes {0} [built]
     + 13 hidden modules
chunk    {1} deacfa20b80b9a83d92f.js 45.7 KiB ={0}= ={2}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    9 modules
chunk    {2} b151fc0a66a1fcdce12e.js 39.3 KiB ={0}= ={1}= >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    8 modules
chunk    {3} 1720e04fd18f5f8dcd95.js 45.7 KiB <{0}> <{1}> <{2}> ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    23 modules
chunk    {4} 0a0f27dcdc8ba1a1b4b5.js 43.3 KiB <{0}> <{1}> <{2}> ={3}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    3 modules
chunk    {5} b54f0f53a39d17d1c444.js 44.4 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    10 modules
chunk    {6} 554d0aaa9405a41a39c5.js 46.6 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    24 modules
chunk    {7} 82f356175ebb96ba71e7.js 34 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    16 modules
chunk    {8} c7a9c7d3afbcccecff17.js 48.2 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={9}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    20 modules
chunk    {9} 3b424e33566ed6d0942c.js 62.3 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    7 modules
chunk   {10} 97afb6c3e6e959a31dd8.js 46.2 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={11}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    9 modules
chunk   {11} 66096f7964d21fc670d6.js 48.4 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={12}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    6 modules
chunk   {12} 5df3f9a16253c400b355.js 46.3 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={13}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    10 modules
chunk   {13} 1c33e7c9231d1b0dac91.js 46.9 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={14}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    8 modules
chunk   {14} d2dbaa46a12dabb4476a.js 24.9 KiB <{0}> <{1}> <{2}> ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= ={10}= ={11}= ={12}= ={13}= [rendered] split chunk (cache group: vendors)
    > react-dom [0] ./example.js 2:0-22
    3 modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.29.0
                  Asset      Size  Chunks             Chunk Names
2db04bafab3ddcad85f1.js  10.2 KiB       0  [emitted]  
2e27b1d49ddf418301e2.js  4.21 KiB      14  [emitted]  
2e8b58579b5cd770c950.js  10.9 KiB       5  [emitted]  
51b05717d2888a690e0a.js  10.5 KiB      13  [emitted]  
51d0bdcabbfda951dacf.js    12 KiB       1  [emitted]  
6f2a052e30adf4750f01.js  9.96 KiB       2  [emitted]  
70bf91c4560f24730b96.js  11.1 KiB       7  [emitted]  
8feb6295c45a372b91cf.js  13.1 KiB       8  [emitted]  
c7c3ee87ad4515affe37.js  6.34 KiB       4  [emitted]  
d136f6995b73a3ce4d05.js  8.13 KiB       3  [emitted]  
de0438f29bb715db872d.js  9.91 KiB      10  [emitted]  
e98052f068d298c3c92b.js  10.1 KiB       6  [emitted]  
ea1823fb419e58962983.js  14.8 KiB      11  [emitted]  
ed23514132a692784b89.js  6.71 KiB       9  [emitted]  
ff0fd762b2413530eafb.js  7.86 KiB      12  [emitted]  
Entrypoint main = ed23514132a692784b89.js 70bf91c4560f24730b96.js c7c3ee87ad4515affe37.js
chunk    {0} 2db04bafab3ddcad85f1.js 46.6 KiB <{4}> <{7}> <{9}> ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    24 modules
chunk    {1} 51d0bdcabbfda951dacf.js 45.7 KiB <{4}> <{7}> <{9}> ={0}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    23 modules
chunk    {2} 6f2a052e30adf4750f01.js 48.2 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    20 modules
chunk    {3} d136f6995b73a3ce4d05.js 34 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    16 modules
chunk    {4} c7c3ee87ad4515affe37.js 28.3 KiB ={7}= ={9}= >{0}< >{1}< >{2}< >{3}< >{5}< >{6}< >{8}< >{10}< >{11}< >{12}< >{13}< >{14}< [entry] [rendered]
    > ./example main
 [14] ./example.js 42 bytes {4} [built]
     + 13 hidden modules
chunk    {5} 2e8b58579b5cd770c950.js 46.3 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    10 modules
chunk    {6} e98052f068d298c3c92b.js 44.4 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={8}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    10 modules
chunk    {7} 70bf91c4560f24730b96.js 45.7 KiB ={4}= ={9}= >{0}< >{1}< >{2}< >{3}< >{5}< >{6}< >{8}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    9 modules
chunk    {8} 8feb6295c45a372b91cf.js 46.2 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={10}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    9 modules
chunk    {9} ed23514132a692784b89.js 39.3 KiB ={4}= ={7}= >{0}< >{1}< >{2}< >{3}< >{5}< >{6}< >{8}< >{10}< >{11}< >{12}< >{13}< >{14}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    8 modules
chunk   {10} de0438f29bb715db872d.js 46.9 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={11}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    8 modules
chunk   {11} ea1823fb419e58962983.js 62.3 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={12}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    7 modules
chunk   {12} ff0fd762b2413530eafb.js 48.4 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={13}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    6 modules
chunk   {13} 51b05717d2888a690e0a.js 43.3 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={14}= [rendered] [recorded] aggressive splitted
    > react-dom [14] ./example.js 2:0-22
    3 modules
chunk   {14} 2e27b1d49ddf418301e2.js 24.9 KiB <{4}> <{7}> <{9}> ={0}= ={1}= ={2}= ={3}= ={5}= ={6}= ={8}= ={10}= ={11}= ={12}= ={13}= [rendered]
    > react-dom [14] ./example.js 2:0-22
    3 modules
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
    "bySource": {
      "0 example.js react-dom": 3,
      "4 example.js react-dom": 4,
      "5 example.js react-dom": 5,
      "10 example.js react-dom": 6,
      "6 example.js react-dom": 7,
      "9 example.js react-dom": 8,
      "3 example.js react-dom": 9,
      "8 example.js react-dom": 10,
      "7 example.js react-dom": 11,
      "2 example.js react-dom": 12,
      "1 example.js react-dom": 13,
      "11 example.js react-dom": 14
    },
    "usedIds": [
      0,
      1,
      10,
      11,
      12,
      13,
      14,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ]
  },
  "aggressiveSplits": [
    {
      "modules": [
        "../../node_modules/prop-types/factoryWithTypeCheckers.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/react/lib/ReactBaseClasses.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/ReactDOMFactories.js"
      ],
      "size": 46762,
      "hash": "deacfa20b80b9a83d92f2c3bf7316764",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/create-react-class/factory.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/prop-types/factory.js"
      ],
      "size": 40275,
      "hash": "b151fc0a66a1fcdce12e4135605909e6",
      "id": 2
    }
  ]
}
```
