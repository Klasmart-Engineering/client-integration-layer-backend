FROM node:lts AS build
RUN echo "Node version $(node -v)"

WORKDIR /usr/src/app
COPY ./ ./

WORKDIR /usr/src/app/cil-lib
RUN npm ci
RUN npm run prisma:generate
RUN npm run build
WORKDIR /usr/src/app/cil-api
RUN npm ci
RUN npm run build

FROM node:lts as release
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/cil-lib/dist ./cil-lib/dist
COPY --from=build /usr/src/app/cil-lib/node_modules ./cil-lib/node_modules
COPY --from=build /usr/src/app/cil-lib/package.json ./cil-lib/package.json
COPY --from=build /usr/src/app/cil-api/dist ./cil-api/dist
COPY --from=build /usr/src/app/cil-api/package.json ./cil-api/package.json
COPY --from=build /usr/src/app/cil-api/node_modules ./cil-api/node_modules
COPY ./cil-api/newrelic.js ./cil-api/newrelic.js
WORKDIR /usr/src/app/cil-api

ENV PORT=4200
EXPOSE 4200
CMD ["npm", "run", "start"]
