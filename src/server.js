import express from 'express'
import cors from 'cors'
import { corsOptions } from './config/cors'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
const app = express()

app.use(cors(corsOptions))

app.use(express.json())
app.use('/api/v1', APIs_V1)

// Middleware xử lý lỗi tập trung trong ứng dụng Back-end NodeJS (ExpressJS)
app.use(errorHandlingMiddleware)

app.listen(env.APP_PORT, env.APP_HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://${env.APP_HOST}:${env.APP_PORT}/`)
})
