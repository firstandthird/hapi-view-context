var _ = require('lodash');

exports.register = function(server, options, next) {
  options = options || {};

  server.expose('setViewContext', function(fn) {
    server.ext('onPostHandler', function(request, reply) {
      var response = request.response;
      if (response.variety === 'view') {
        response.source.context = fn(response.source.context || {}, request);
      }
      reply.continue();
    });
  });

  if (options.enableDebug) {
    server.on('tail', function(request) {
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
