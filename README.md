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

## Installation & Running Locally

1. Run the project dependencies, the easiest way of doing this is to use the `docker-compose.yml` file located in the project root.
2. Copy and populate a `.env` file in the `cil-api` repository _(based off the `.env.example` file)_
3. `cd cil-lib` and run `npm install && npm run build` in order to build the library
4. Run the database migrations with `npm run migrate:dev` _(you will need to either set the `DATABASE_URL` environment variable to point to the postgres instance, or alternatively create a `.env` file in the directory with that environment variable set)_
5. `cd ../cil-api` and run `npm install && npm run build` in order to build the api
6. You can then decide whether you want to run the compiled javascript - `npm run start` or the typescript - `npm run start:dev`

## Building the docker image

The `Dockerfile` for the project is located in the project root, and should be run there

```sh
docker build --tag cil-api:latest .
```

## New Relic

Set `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_APP_NAME` in your `.env` file. If you don't have the information, register at https://newrelic.com and create one.

## Publish to npm registry

```
cd cil-lib
npm publish
```
