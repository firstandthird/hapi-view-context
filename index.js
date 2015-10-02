var _ = require('lodash');

exports.register = function(server, options, next) {

  options = options || {};

  var addContext = function(request, key, data) {
    var response = request.response;

    if (response.variety !== 'view') {
      return;
    }

    response.source.context = _.set(response.source.context || {}, key, data);

    return response.source.context;
  };

  server.expose('addContext', addContext);

  server.ext('onPreResponse', function(request, reply) {
    _.forIn(options.context, function(value, key) {
      addContext(request, key, value);
    });

    reply.continue();
  });

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
