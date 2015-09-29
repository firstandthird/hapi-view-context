## hapi-view-context

Loads data into view context

### Installation

`npm install hapi-view-context`

### Usage

```js
server.register({
  register: require('hapi-view-context'),
  options: {
    'someVariable': 'Some Value',
    'some.nested.variable': 'Another value'
  }
});
```

Options are used to set the default context. The object key will match the context path.

```js
server.ext('onPreResponse', function(request, reply) {

  server.plugins['hapi-view-context'].addContext('amazingData', 'More data');

});
```
