var _ = require('lodash');

exports.register = function(server, initial, next) {
  var self = this;

  this.addContext = function(request, key, data) {
    var response = request.response;

    if (response.variety !== 'view') return;

    response.source.context = _.set(response.source.context || {}, key, data);

    return response.source.context;
  };

  server.expose('addContext', this.addContext);

  server.ext('onPreResponse', function(request, reply) {
    _.forIn(initial, function(value, key) {
      self.addContext(request, key, value);
    });

    reply.continue();
  });

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
