# Mercurius dynamic schema 

**This plugin is just a proof of concept**

Sometimes can be useful to serve a different schema per request, in order to achieve this result the mercurius dynamic schema plugin can be used.

## Import deps

```js
const Fastify = require("fastify");
const mercurius = require("mercurius");
const mercuriusDynamicSchema = require("..");
```

## Define schema and resolvers

```js
const app = Fastify({
  logger: true,
});

// Schema 1 definition
const schema = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `;

const resolvers = {
  Query: {
    add: async (_, obj) => {
      const { x, y } = obj;
      return x + y;
    },
  },
};

// Schema 2 definition
const schema2 = `
    type Query {
      subtract(x: Int, y: Int): Int
    }
  `;

const resolvers2 = {
  Query: {
    subtract: async (_, obj) => {
      const { x, y } = obj;
      return x - y;
    },
  },
};
```

## Register the plugin

```js
app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: "schema1",
      schema: schema,
      resolvers: resolvers,
      path: "/",
    },
    {
      name: "schema2",
      schema: schema2,
      resolvers: resolvers2,
      path: "/",
    },
  ],
  strategy: (req, ctx) => {
    return req.headers?.schema || "schema1";
  },
});

app.listen({ port: 3000 });
```

# This project also contains

- code linting with [ESlint](https://eslint.org) and [prettier](https://prettier.io)
- pre-commit code linting and commit message linting with [husky](https://www.npmjs.com/package/husky) and [commitlint](https://commitlint.js.org/)
- dependabot setup with automatic merging thanks to ["merge dependabot" GitHub action](https://github.com/fastify/github-action-merge-dependabot)
- notifications about commits waiting to be released thanks to ["notify release" GitHub action](https://github.com/nearform/github-action-notify-release)
- PRs' linked issues check with ["check linked issues" GitHub action](https://github.com/nearform/github-action-check-linked-issues)
- Continuous Integration GitHub workflow
