import express from 'express'
import path from 'path'
import proxy from 'http-proxy-middleware'

import Prismic from 'prismic-javascript'
import PrismicConfig from '../prismic-configuration'
import reactApp from './app'

const host = process.env.REACT_APP_HOST || 'localhost'
const serverPort = process.env.NODE_ENV === 'development'?
  process.env.REACT_APP_SERVER_PORT :
  process.env.REACT_APP_PORT || 80

const app = express()

if (process.env.NODE_ENV === 'production') {
  // In production we want to serve our JavaScripts from a file on the file
  // system.
  app.use('/static', express.static(path.join(process.cwd(), 'build/client/static')));
} else {
  // Otherwise we want to proxy the webpack development server.
  app.use(['/static','/sockjs-node'], proxy({
    target: `http://localhost:${process.env.REACT_APP_CLIENT_PORT}`,
    ws: true,
    logLevel: 'error'
  }));
}

// Middleware to inject prismic context
app.use((req, res, next) => {
  res.locals.ctx = {
    endpoint: PrismicConfig.apiEndpoint,
    linkResolver: PrismicConfig.linkResolver,
  };
  // add PrismicDOM in locals to access them in templates.
  Prismic.api(PrismicConfig.apiEndpoint, {
    accessToken: PrismicConfig.accessToken,
    req,
  }).then((api) => {
    req.prismic = { api };
    next();
  }).catch((error) => {
    next(error.message);
  });
});

app.use('/', express.static('build/client'))

app.use(reactApp)

app.listen(serverPort)
console.log(`Listening at http://${host}:${serverPort}`)
