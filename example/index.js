'use strict';
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.register(require('vision'), (err) => {
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
      something: 'Something',
      'nested.something': 'Nested'
    }
  }
}, (err) => {
  if (err) {
    console.error('Failed to load a plugin:', err);
    return;
  }

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, reply) => {
      reply.view('example');
    }
  });

  server.start(() => {
    console.log('Server running at:', server.info.uri);
  });
});
