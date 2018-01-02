/// <reference path="../webpack.d.ts" />
var config = [
    {
        name: "vendor",
        entry: ["./vendor", "./vendor2"],
        output: {
            path: "js",
            filename: "vendor.js",
            library: "vendor_[hash]"
        },
        plugins: [
            new Object({
                name: "vendor_[hash]",
                path: "js/manifest.json"
            })
        ]
    },
    {
        name: "app",
        dependencies: ["vendor"],
        entry: {
            pageA: "./pageA",
            pageB: "./pageB",
            pageC: "./pageC"
        },
        output: {
            path: "js",
            filename: 123
        },
        plugins: [
            new Object({
                manifest: "js/manifest.json"
            })
        ]
    }
];
