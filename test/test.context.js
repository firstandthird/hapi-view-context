'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const viewContext = require('../');

let server;

lab.experiment('hapi-hooks', () => {
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

  lab.test(' the plugin can be registered with hapi ', { timeout: 10000 }, (done) => {
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
      code.expect(typeof server.plugins['hapi-view-context'].setViewContext).to.equal('function');
      done();
    });
  });

  lab.test('renders a template using the default context ', { timeout: 10000 }, (done) => {
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
      server.plugins['hapi-view-context'].setViewContext((context) => context);
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

  lab.test('lets you re-set the context ', { timeout: 10000 }, (done) => {
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
          reply.view('example');
        }
      });
      server.plugins['hapi-view-context'].setViewContext((context) => {
        context.something = 'view1';
        return context;
      });

      server.inject({
        method: 'POST',
        url: '/',
      }, (response) => {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.include('view1');
        server.plugins['hapi-view-context'].setViewContext((context) => {
          context.nested.something = 'view2';
          return context;
        });
        server.inject({
          method: 'POST',
          url: '/',
        }, (response2) => {
          code.expect(response2.result).to.not.include('view1');
          code.expect(response2.result).to.include('Something');
          code.expect(response2.result).to.include('view2');
          done();
        });
      });
    });
  });

  lab.test('custom context method', (done) => {
    server.register({
      register: viewContext,
      options: {
        enableDebug: true,
        contextFunction: (context) => {
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
});
