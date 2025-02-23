# Welcome to the Client Integration Layer (CIL) - Generic Backend

> The term _generic backend_ refers to a client agnostic approach to how we process **onboarding** flows for partners and customers within this application there should be no awareness of any particular customer/partner.

## Overview

The backend itself exposes a _protobuf gRPC_ api. There are two main directories in the project

- `cil-lib` - a library that exposes 95% of the functionality in this repo, it is intended that any client specific transformation/translation applications _(written in typescript)_ will consume this library
  - The `.proto` files defining for the spec for the API are found in this directory `cil-lib/protos`
  - This library also exposes a fully type-genned version of the protobuf client, so there is no need to compile it from the `.proto` files unless you intend on consuming the api from a different programming language
- `cil-api` - this is the actual API itself, effectively it is a very thin wrapper around the library and contains minimal amounts of code

## Useful Links

- [Miro - Architecture](https://miro.com/app/board/uXjVOSsPDdM=/)
- [Confluence](https://calmisland.atlassian.net/wiki/spaces/CIL/overview)

## Dependencies

| Name            | Description                                                                       | Location    |
| --------------- | --------------------------------------------------------------------------------- | ----------- |
| `Postgres`      | Primarily used to store _mappings_ between external UUIDs and internal UUIDs      | Third Party |
| `Admin Service` | _(aka User Service)_ used to actually insert entities into the KidsLoop Ecosystem | Internal    |

## Set up environment variables with direnv

Direnv will automatically scope your local environment variables to the directory you are currently in

1. Install direnv (e.g using `brew install direnv`)
2. Hook direnv into your shell (command varies according to your shell type: refer to https://github.com/direnv/direnv/blob/master/docs/hook.md)
3. Create and populate a `.envrc` file in the `cil-api` directory, _(based off the `.envrc.example` file in the same directory)_
4. Run `direnv allow`
5. Now create and populate a `.envrc` file in the `cil-lib` directory, _(based off the `.envrc.example` file in the same directory)_
6. Again, run `direnv allow`

## Installation & Running Locally

1. You should have already set up your environment variables using direnv (refer to previous section)
2. Run the project dependencies, the easiest way of doing this is to use the `docker-compose.yml` file located in the project root. (E.g `docker-compose up -d` to run detached)
3. `cd cil-lib` and run `npm install && npm run build` in order to build the library
4. Run the database migrations with `npm run migrate:dev` _(The `DATABASE_URL` environment variable should be pointing to the postgres instance, in your .envrc files)_
5. `cd ../cil-api` and run `npm install && npm run build` in order to build the api
6. You can then decide whether you want to run the compiled javascript - `npm run start` or the typescript - `npm run start:dev`
7. Test everything works by running `cd cil-lib` and `npm run manual:test`

## Building the docker image

The `Dockerfile` for the project is located in the project root, and should be run there

```sh
docker build --tag cil-api:latest .
```

## New Relic

Set `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_APP_NAME` in your `.env` file. If you don't have the information, register at https://newrelic.com and create one.

## Publish cil-lib to private npm registry

### Access token & login to npm registry

[instructions](https://calmisland.atlassian.net/wiki/spaces/ED/pages/2537193585/GH+Storing+libraries+and+containers+in+Github+Packages#Getting-access)

1. Create an Github Access Token (authorized with sso) if you don't already have one.

2. Login to the private npm registry

Enter your username, Github Access token for password and work email

```
npm login --scope=@kl-engineering --registry=https://npm.pkg.github.com
```

### Publishing cil-lib

For this project we are only publishing external libs.
cil-lib which is used by other projects e.g. [c1 transformation api](https://github.com/KL-Engineering/mcb-integration-layer)

1. Increment the version in the major or minor version of cil-lib/package.json. e.g. 1.0.1 -> 1.02.
2. Then publish changes

```
cd cil-lib && npm publish
```

### Usage of cil-lib (prisma)

1. Include prisma in their [dev dependencies](https://github.com/KL-Engineering/client-integration-layer-backend/blob/main/cil-lib/package.json#L100) (match the version if possible)
2. Create a postinstall script that has:

```
`npx prisma generate --schema='./node_modules/@kl-engineering/cil-lib/prisma/schema.prisma'`
```

## Mocha debugger for VS Code
This is already configured in `./vscode/launch.json`

You can choose  between debugging the unit tests in `cil-lib` or integration tests in `cil-api` using the run menu in the Debug tab.
When running tests, ensure that the API server is running (see Installation and Running locally).