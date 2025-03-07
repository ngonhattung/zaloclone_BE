import express from 'express'
import { env } from '~/config/environment'
const app = express()

app.get('/', (req, res) => {
  res.end('Hello World!')
})

app.listen(env.APP_PORT, env.APP_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${env.APP_HOST}:${env.APP_PORT}/`)
})
