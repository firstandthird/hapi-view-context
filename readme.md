# hapi-view-context

Helpers to automate the task of loading data into view contexts.

### Installation

`npm install hapi-view-context`

### Usage

hapi-view-context lets you set up data in the current view rendering context in one of four ways:
1. pass static global-level default key:value pairs (in the plugin options _context_ field) that will be added to all contexts
2. pass a global-level context-handling function or server method (in the plugin options _contextHandler_ field), that will be invoked whenever 'onPostHandler' is called
3. set a global-level context-handling function with _server.setViewContext_, the context-handler will then be invoked whenever 'onPostHandler' is called
4. set request-level contexts inside route handlers and in response to request events with _addContext_.

## Example:

```js
// register the plugin with a hapi server:
server.register({
  register: require('hapi-view-context'),
  options: {
    // static global-level default key:value pairs in 'context' will be added to all contexts:
    context: {
      'someVariable': 'Some Value',
      'some.nested.variable': 'Another value'
    },
    // a global-level context-handling function will be called on every request:
    contextHandler: (defaultContext, request) => {
      defaultContext.fromContextMethod = 'a value from the context method';
      return defaultContext;
    }
  }
});
// a context handler that will be able to modify the context for every request
server.setViewContext( (defaultContext, request) => {
  defaultContext.fromSetViewContext = 'a value from setViewContext';
  return defaultContext;
});
// a route that renders a view:
server.route({
  method: 'POST',
  path: '/',
  handler: (request, reply) => {
    // the route handler does not need to do anything else besides call the view renderer:
    reply.view('myView');
  }
});
```

Assuming that 'myView' is an HTML view that looks something like:
```html
<h1> {{someVariable}}, {{some.nested.variable}}, {{fromContextMethod}}, {{fromSetViewContext}}.
</h1>
```

Then posting to the '/' route will render myView as the following:
```html
<h1> Some Value, Another value, a value from the context method, a value from setViewContext.</h1>
```

We can add to the context for a specific request as well:

```js
let calledOnce = false;
server.ext('onPostHandler', (request, reply) => {
  if (!calledOnce) {
    calledOnce = true;
    server.plugins['hapi-view-context'].addContext(request, { someVariable: 'a totally different value' });
  }
  reply.continue();
});
```

Posting to '/' the first time will now return:
```html
<h1> a totally different value, Another value, a value from the context method, a value from setViewContext.</h1>
```

But subsequent calls will not have the context that was added to the previous request:
```html
<h1> Some Value, Another value, a value from the context method, a value from setViewContext.</h1>
```

See _/test/test.context.js_ for more examples and usage.
