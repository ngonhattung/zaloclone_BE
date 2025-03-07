import 'dotenv/config'

export const env = {
  DYNAMODB_URI: process.env.DYNAMODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  APP_PORT: process.env.APP_PORT,
  APP_HOST: process.env.APP_HOST
}
