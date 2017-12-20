'use strict';
const Hapi = require('hapi');

const f = async() => {
  const server = new Hapi.Server({ port: 3000 });

  await server.register(require('vision'));
  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'templates'
  });

  await server.register({
    plugin: require('../'),
    options: {
      enableDebug: true,
      context: {
        something: 'Something',
        'nested.something': 'Nested'
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => h.view('example')
  });

  await server.start();
  console.log('Server running at:', server.info.uri);
};

f();
