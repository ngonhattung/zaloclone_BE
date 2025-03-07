import 'dotenv/config'

export const env = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  APP_PORT: process.env.APP_PORT,
  APP_HOST: process.env.APP_HOST
}
