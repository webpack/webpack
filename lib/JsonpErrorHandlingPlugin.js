/**
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
 */

var
    JsonpErrorHandlingTemplatePlugin = require('./JsonpErrorHandlingTemplatePlugin');

module.exports = JsonpErrorHandlingPlugin;

function JsonpErrorHandlingPlugin() {
}

JsonpErrorHandlingPlugin.prototype.apply = function (compiler) {
    compiler.plugin('compilation', function(compilation) {
        compilation.mainTemplate.apply(new JsonpErrorHandlingTemplatePlugin());
    });
};
