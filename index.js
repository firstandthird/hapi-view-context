'use strict';
const _ = require('lodash');

exports.register = function(server, options, next) {
  options = options || {};
  const defaultContextHandler = (request, reply) => {
    // ignore if this isn't rendering a view:
    if (request.response.variety !== 'view') {
      return reply.continue();
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
    reply.continue();
  };

  // register one handler that handles building the context for each request:
  server.ext('onPostHandler', defaultContextHandler);

  // allow others to add to this request's context:
  server.expose('addContext', (request, ...context) => {
    let newContext = {};
    // context is either an object or a key: value pair
    if (context.length === 1 && typeof context[0] === 'object') {
      newContext = _.defaults(context[0], options.context);
    } else if (context.length === 2) {
      newContext[context[0]] = context[1];
    }
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
    server.ext('onPostHandler', (request, reply) => {
      const response = request.response;
      if (response.variety === 'view') {
        response.source.context = fn(response.source.context || {}, request);
      }
      reply.continue();
    });
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
