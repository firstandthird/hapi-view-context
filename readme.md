# hapi-view-context [![Build Status](https://travis-ci.org/firstandthird/hapi-view-context.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-view-context)

Helpers to automate the task of loading data into view rendering contexts.  Keeps your route handlers clean!

### Installation

`npm install hapi-view-context`

### Usage

hapi-view-context lets you set up data in the current view rendering context in one of four ways:

1. pass static global-level default key:value pairs (in the plugin options _context_ field) that will be added to all contexts:
```js
const viewContextPlugin = require('hapi-view-context');
await server.register({
  plugin: viewContext,
  options: {
    context: {
      siteVersion: '2.4.3',
      copyright: 'Copyright (c) 2021 by You'
    }
  }
});
```

_siteVersion_ and _copyright_ will now be available every time you render a view

2. pass a global-level context-handling function or server method (in the plugin options _contextHandler_ field), that will be invoked whenever 'onPostHandler' is called:
```js
await server.register({
  plugin: viewContext,
  options: {
    contextHandler: (context, request) => {
      context.id = request.id;
      context.time = new Date();
      context.user = await request.server.users.find({ _id: context.userId });
      return context;
    }
  }
});
```

This function is re-invoked every time you render a view, so it is very useful for when you have dynamic data that you want to make available for all of your views.

3. set a global-level context-handling function directly on the server using _server.plugins['hapi-view-context'].setViewContext_.  Like the _contextHandler_ function above, the additional context-handler will then be invoked whenever 'onPostHandler' is called:
```js
server.plugins['hapi-view-context'].setViewContext( (context, request) => {
  context.id = request.id;
  return context;
});
```

4. set request-level contexts inside route handlers and in response to request events with _addContext_.
```js
server.plugins['hapi-view-context]].addContext(request, { id: request.id });
```

## Example:

```js
// register the plugin with a hapi server:
server.register({
  register: require('hapi-view-context'),
  options: {
    // static global-level default key:value pairs in 'context' will be added to all contexts:
    context: {
      siteName: 'Zombo.Com',
      clickText: 'Click Me!',
      isAdmin: false
    },
    // a global-level context-handling function will be called on every request:
    contextHandler(context, request) {
      context.fromContextMethod = 'a value from the context method';
      if (request.id) {
        context.id = id;
      }
      if (request.state.session && request.state.session.isAdmin) {
        context.isAdmin = true;
      }
      return context;
    }
  }
});
// a context handler that will be able to modify the context for every request
server.plugins['hapi-view-context'].setViewContext((defaultContext, request) => {
  defaultContext.fromSetViewContext = 'a value from setViewContext';
  return defaultContext;
});
// a route that renders a view:
server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    // the route handler does not need to do anything else besides call the view renderer:
    reply.view('myView');
  }
});
```

Assuming that 'myView' is an HTML view that looks something like:
```html
<h1>{{siteName}}</h1>
<button> {{clickText}} </button>
{% if isAdmin %}
<button>Admin Menu </button>
{% endif %}
```

Then getting the '/' route will render myView as the following:
```html
<h1> Zombo.Com</h1>
<button> Click Me! </button>
```

And getting it while logged in as an admin:
```html
<h1> Zombo.Com</h1>
<button> Click Me! </button>
<button> Admin Menu </button>
```

We can add to the context for a specific request as well:

```js
let calledOnce = false;
server.ext('onPostHandler', (request, h) => {
  // addContext will only add to the context for the current request:
  if (!calledOnce) {
    server.plugins['hapi-view-context'].addContext(request, { clickText: 'Welcome Back' });
  }
  calledOnce = true;
  return h.continue();
});
```

Fetching '/' the first time will now return:
```html
<h1> Zombo.Com</h1>
<button> Click Me! </button>
```

But subsequent calls will not have the context that was added to the previous request:
```html
<h1> Zombo.Com</h1>
<button> Welcome Back </button>
```

## Options
- __context__

   Default context object for view handlers

- __contextHandler__

  Context-handling methods

- __enableDebug__

  Will log when context is loader
