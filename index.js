'use strict';
const _ = require('lodash');

exports.register = function(server, options, next) {
  options = options || {};
  let called = 0;
  const addViewContextHandler = (fn) => {
    server.ext('onPostHandler', (request, reply) => {
      const response = request.response;
      if (response.variety === 'view') {
        // set up the default context
        response.source.context = response.source.context ? response.source.context : {};
        _.each(options.context, (contextValue, contextKey) => {
          _.set(response.source.context, contextKey, contextValue);
        });
        // get any additional context
        response.source.context = fn(response.source.context || {}, request);
      }
      reply.continue();
    });
  };
  // if options specified a default contextFunction register it with the server:
  if (options.contextFunction) {
    if (typeof options.contextFunction === 'string') {
      options.contextFunction = _.get(server, options.contextFunction);
    }
    if (typeof options.contextFunction === 'function') {
      addViewContextHandler(options.contextFunction);
    }
  }
  // let others also use the context-setting handler:
  server.expose('setViewContext', (fn) => {
    addViewContextHandler(fn);
  });

  if (options.enableDebug) {
    server.on('tail', (request) => {
      if (request.query.context && request.response.source && request.response.source.context) {
        server.log(['hapi-view-context', 'debug'], {
          url: request.url.path,
          query: request.query,
          context: request.response.source.context
        });
      }
    });
  }
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
