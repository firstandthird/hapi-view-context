var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({ port: 3000 });

server.register(require('vision'), function (err) {
  if (err) {
    console.error('Failed to load a plugin:', err);
    return;
  }

  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'templates'
  });
});

server.register({
  register: require('../'),
  options: {
    enableDebug: true,
    context: {
      'something': 'Something',
      'nested.something': 'Nested'
    }
  }
}, function (err) {
  if (err) {
    console.error('Failed to load a plugin:', err);
    return;
  }

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.view('example');
    }
  });

  server.start(function() {
    console.log('Server running at:', server.info.uri);
  });
});
