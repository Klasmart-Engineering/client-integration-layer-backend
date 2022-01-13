# Welcome to the MCB Client Integration Layer!

- Follow installation & running instructions below.

## Architecture

![architecture](diagrams/architecture.png)

## TODO - Generalize the API

In order to support multiple clients, the code needs to be updated to generate a
unique REDIS stream for each client. Then based off authentication of the
request maker, you choose the appropriate stream to publish the message to.
Workers can then be specific to each client.

# Installation

Setup environment variables:

- Create a `.env` file by copying the contents of `.env.example`

Install postgres:

- `docker run -d --name=postgres-database -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres`

Install redis:

- `docker run -d --name=redis-database -p 6379:6379 redis:alpine`

Install dependencies:

- `npm i`
- `npx prisma db push`
- `npm run prisma:generate`

## New Relic

Set `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_APP_NAME` in your `.env` file. If you don't have the information, register at https://newrelic.com and create one.

# Running

Start postgres:

- `docker start postgres-database`

Start redis:

- `docker start redis-database`

Start the application:

- `npm start`
- or, `npm run start:dev` for nodemon monitoring

### Docker

You can also run the application with its dependencies through a docker-compose. For this just run:

- `docker-compose up`

### Migration

- `npm run migrate:dev`

