'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const viewContext = require('../');

let server;

lab.experiment('hapi-view-context', () => {
  lab.beforeEach((done) => {
    server = new Hapi.Server({
      debug: {
        log: ['hapi-auth-email', 'warning', 'info', 'error']
      }
    });
    server.connection({ host: 'localhost', port: 8000 });
    server.register(require('vision'), (err) => {
      if (err) {
        throw err;
      }
      server.views({
        engines: {
          html: require('handlebars')
        },
        relativeTo: __dirname,
        path: 'templates'
      });
    });
    done();
  });

  lab.afterEach((done) => {
    server.stop(done);
  });

  lab.test(' the plugin exposes the addContext and setViewContext methods for hapi ', (done) => {
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          'nested.something': 'Nested'
        }
      }
    }, (err) => {
      code.expect(err).to.equal(undefined);
      code.expect(typeof server.plugins['hapi-view-context'].addContext).to.equal('function');
      code.expect(typeof server.plugins['hapi-view-context'].setViewContext).to.equal('function');
      done();
    });
  });

  lab.test('renders a template including the default context that was passed in options ', (done) => {
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          'nested.something': 'Nested'
        }
      }
    }, (err) => {
      code.expect(err).to.equal(undefined);
      server.route({
        method: 'POST',
        path: '/',
        handler: (request, reply) => {
          reply.view('example');
        }
      });
      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.include('Something');
        code.expect(response.result).to.include('Nested');
        done();
      });
    });
  });

  lab.test('can add to the context of an individual request', (done) => {
    let prevValue = 0;
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          nested: {
            something: 'Nested'
          }
        }
      }
    }, (err) => {
      let requestCount = 0;
      code.expect(err).to.equal(undefined);
      server.route({
        method: 'POST',
        path: '/',
        handler: (request, reply) => {
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
          reply.view('example');
        }
      });
      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        // first call to the route will have prevValue
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.include(prevValue);
        // second call to the route will not have any of the changes made in the previous call:
        server.inject({
          method: 'POST',
          url: '/',
        }, (response2) => {
          code.expect(response2.result).to.not.include(prevValue);
          code.expect(response2.result).to.include('Something');
          code.expect(response2.result).to.include('view2');
          done();
        });
      });
    });
  });

  lab.test('can let you set a custom handler with setViewContext', (done) => {
    let prevValue = 0;
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        context: {
          something: 'Something',
          nested: {
            something: 'Nested'
          }
        }
      }
    }, (err) => {
      code.expect(err).to.equal(undefined);
      server.route({
        method: 'POST',
        path: '/',
        handler: (request, reply) => {
          prevValue = Math.random().toString();
          server.plugins['hapi-view-context'].addContext(request, { something: prevValue });
          reply.view('example');
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
      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.not.include(prevValue);
        server.inject({
          method: 'POST',
          url: '/',
        }, (response2) => {
          code.expect(response2.result).to.not.include(prevValue);
          code.expect(response2.result).to.include(handlerValue);
          done();
        });
      });
    });
  });

  lab.test('can let you pass a default custom handler in the options', (done) => {
    server.register({
      register: viewContext,
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
    }, (err) => {
      code.expect(err).to.equal(undefined);
      server.route({
        method: 'POST',
        path: '/',
        handler: (request, reply) => {
          reply.view('method');
        }
      });
      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.include('default');
        code.expect(response.result).to.include('method');
        done();
      });
    });
  });

  lab.test('can let you use a named server method (even one that may not have been registered with the server yet) as the default custom handler', (done) => {
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        contextHandler: 'serverMethod',
        context: {
          defaultValue: 'default'
        }
      }
    }, (err) => {
      code.expect(err).to.equal(undefined);
      server.route({
        method: 'POST',
        path: '/',
        handler: (request, reply) => {
          reply.view('method');
        }
      });
      // the server method we will use as the contextHandler,
      server.method('serverMethod', (context) => {
        context.methodValue = 'method';
        return context;
      });
      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.include('default');
        code.expect(response.result).to.include('method');
        done();
      });
    });
  });
});
