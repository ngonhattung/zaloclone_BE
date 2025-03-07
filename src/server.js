import express from 'express'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
const app = express()

app.use(express.json())
app.use('/api/v1', APIs_V1)

app.listen(env.APP_PORT, env.APP_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${env.APP_HOST}:${env.APP_PORT}/`)
})
