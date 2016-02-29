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

  server.ext('onPreResponse', function(request, reply) {
    addContext(request, options.context);

    if (options.enableDebug && typeof request.query.context === 'string') {
      var selected = _.get(request.response.source.context, request.query.context);
      var context = request.response.source.context;

      if (selected !== undefined) {
        var out = {};
        out[request.query.context] = selected;
        context = out;
      }

      return reply(context);
    }

    reply.continue();
  });

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
