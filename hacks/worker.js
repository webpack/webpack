"use strict";

const Parser = require("../lib/Parser");
const NormalModule = require("../lib/NormalModule");
const fs = require("graceful-fs");

const parserMap = {};

module.exports = {
  buildModule(input, callback) {
    const parserLocation = input.parser.optionsLocation;

    if(!parserMap[parserLocation]) {
      parserMap[parserLocation] = new Parser();
      const parserOptions = JSON.parse(fs.readFileSync(parserLocation, "utf8"));
      parserMap[parserLocation].hydrate(parserOptions);
    }

    const loaderContext = input.loaderContext;
    const module = new NormalModule(
      input.moduleProps.request,
      input.moduleProps.userRequest,
      input.moduleProps.rawRequest,
      input.moduleProps.loaders,
      input.moduleProps.resource
    );

    module.hydrate(input.moduleProps);
    module.parser = parserMap[parserLocation];

    module.buildInWorker(loaderContext, require("fs"), input.options, input.compilation, (err) => {
      if(err) callback(err);
      module.parser = undefined;
      const serializeResult = module.serialize();
      callback(null, serializeResult);
    });
  }
};
