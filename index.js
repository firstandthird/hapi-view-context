var _ = require('lodash');

exports.register = function(server, options, next) {
  options = options || {};

  var addContext = function(request, key, data) {
    var response = request.response;

    if (response.variety !== 'view') {
      return;
    }

    var d = {};

    if (typeof key === 'string') {
      d[key] = data;
    } else {
      d = key;
    }

    _.forIn(d, function(value, key) {
      response.source.context = _.set(response.source.context || {}, key, value);
    });

    return response.source.context;
  };

  server.expose('addContext', addContext);

  if (options.context) {
    server.ext('onPostHandler', function(request, reply) {
      addContext(request, options.context);

      reply.continue();
    });
  }

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
