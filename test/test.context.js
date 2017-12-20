'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const viewContext = require('../');

let server;

lab.experiment('hapi-view-context', () => {
  lab.beforeEach(async() => {
    server = new Hapi.Server({
      debug: {
        log: ['hapi-auth-email', 'warning', 'info', 'error']
      },
      host: 'localhost',
      port: 8000
    });
    await server.register(require('vision'));
    server.views({
      engines: {
        html: require('handlebars')
      },
      relativeTo: __dirname,
      path: 'templates'
    });
  });

  lab.afterEach(async() => {
    await server.stop();
  });

  lab.test(' the plugin exposes the addContext and setViewContext methods for hapi ', async() => {
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          'nested.something': 'Nested'
        }
      }
    });
    code.expect(typeof server.plugins['hapi-view-context'].addContext).to.equal('function');
    code.expect(typeof server.plugins['hapi-view-context'].setViewContext).to.equal('function');
  });

  lab.test('renders a template including the default context that was passed in options ', async() => {
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          'nested.something': 'Nested'
        }
      }
    });
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        return h.view('example');
      }
    });
    const response = await server.inject({
      method: 'post',
      url: '/',
    });
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.include('Something');
    code.expect(response.result).to.include('Nested');
  });

  lab.test('can add to the context of an individual request', async() => {
    let prevValue = 0;
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          nested: {
            something: 'Nested'
          }
        }
      }
    });
    let requestCount = 0;
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        prevValue = Math.random().toString();
        // subsequent calls to this route will have a new 'request' object, so only the first call to
        // this view should have prevValue:
        if (requestCount === 0) {
          server.plugins['hapi-view-context'].addContext(request, { something: prevValue });
          requestCount ++;
        } else {
          server.plugins['hapi-view-context'].addContext(request, {
            nested: {
              something: 'view2'
            }
          });
        }
        return h.view('example');
      }
    });
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });
    // first call to the route will have prevValue
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.include(prevValue);
    // second call to the route will not have any of the changes made in the previous call:
    const response2 = await server.inject({
      method: 'POST',
      url: '/',
    });
    code.expect(response2.result).to.not.include(prevValue);
    code.expect(response2.result).to.include('Something');
    code.expect(response2.result).to.include('view2');
  });

  lab.test('can let you set a custom handler with setViewContext', async() => {
    let prevValue = 0;
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          nested: {
            something: 'Nested'
          }
        }
      }
    });
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        prevValue = Math.random().toString();
        server.plugins['hapi-view-context'].addContext(request, { something: prevValue });
        return h.view('example');
      }
    });
    let handlerValue = 0;
    server.plugins['hapi-view-context'].setViewContext((context, request) => {
      // make sure we got the hapi request object:
      code.expect(Object.keys(request)).to.include('server');
      code.expect(Object.keys(request)).to.include('url');
      code.expect(Object.keys(request)).to.include('method');
      handlerValue = Math.random().toString();
      context.something = handlerValue;
      return context;
    });
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.not.include(prevValue);
    const response2 = await server.inject({
      method: 'POST',
      url: '/',
    });
    code.expect(response2.result).to.not.include(prevValue);
    code.expect(response2.result).to.include(handlerValue);
  });

  lab.test('can let you pass a default custom handler in the options', async() => {
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        contextHandler: (context) => {
          context.methodValue = 'method';
          return context;
        },
        context: {
          defaultValue: 'default'
        }
      }
    });
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        return h.view('method');
      }
    });
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.include('default');
    code.expect(response.result).to.include('method');
  });

  lab.test('can let you use a named server method (even one that may not have been registered with the server yet) as the default custom handler', async() => {
    await server.register({
      plugin: viewContext,
      options: {
        enableDebug: true,
        contextHandler: 'serverMethod',
        context: {
          defaultValue: 'default'
        }
      }
    });
    server.route({
      method: 'POST',
      path: '/',
      handler: (request, h) => {
        return h.view('method');
      }
    });
    // the server method we will use as the contextHandler,
    server.method('serverMethod', (context) => {
      context.methodValue = 'method';
      return context;
    });
    const response = await server.inject({
      method: 'POST',
      url: '/',
    });
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.include('default');
    code.expect(response.result).to.include('method');
  });
});
