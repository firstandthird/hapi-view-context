'use strict';
const _ = require('lodash');

const register = async function(server, options) {
  options = options || {};
  const defaultContextHandler = (request, h) => {
    // ignore if this isn't rendering a view:
    if (request.response.variety !== 'view') {
      return h.continue;
    }
    const response = request.response;
    // make sure the view context is initialized:
    response.source.context = response.source.context ? response.source.context : {};
    // add the default context specified in options:
    _.each(options.context, (contextValue, contextKey) => {
      _.set(response.source.context, contextKey, contextValue);
    });
    // add in any additional context that was added to this request with 'addContext':
    if (request.plugins['hapi-view-context'] && request.plugins['hapi-view-context'].context) {
      _.each(request.plugins['hapi-view-context'].context, (contextValue, contextKey) => {
        response.source.context[contextKey] = contextValue;
      });
    }
    // if options specified a default contextHandler, try to process it:
    let method = options.contextHandler ? options.contextHandler : undefined;
    if (typeof method === 'string') {
      method = _.get(server.methods, method);
    }
    if (method) {
      response.source.context = _.defaults(response.source.context, method(response.source.context || {}, request));
    }
    // response.source.context should be set up and ready to go now!
    return h.continue;
  };

  // register one handler that handles building the context for each request:
  server.ext('onPostHandler', defaultContextHandler);

  // allow others to add to this request's context:
  server.expose('addContext', (request, obj) => {
    let newContext = {};
    newContext = _.defaults(obj, options.thing);
    if (!request.plugins) {
      request.plugins = {};
    }
    if (!request.plugins['hapi-view-context']) {
      request.plugins['hapi-view-context'] = {
        context: newContext
      };
    } else {
      request.plugins['hapi-view-context'] = _.defaults(request.plugins['hapi-view-context'].context);
    }
  });

  // lets you add additional viewContextHandlers:
  server.expose('setViewContext', (fn) => {
    server.ext('onPostHandler', (request, h) => {
      const response = request.response;
      if (response.variety === 'view') {
        response.source.context = fn(response.source.context || {}, request);
      }
      return h.continue;
    });
  });

  if (options.enableDebug) {
    server.events.on('response', (request) => {
      if (request.query.context && request.response.source && request.response.source.context) {
        server.log(['hapi-view-context', 'debug'], {
          url: request.path,
          query: request.query,
          context: request.response.source.context
        });
      }
    });
  }
};

exports.plugin = {
  name: 'hapi-view-context',
  register,
  once: true,
  pkg: require('./package.json')
};
