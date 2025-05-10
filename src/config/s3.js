import AWS from 'aws-sdk'
import { env } from '~/config/environment'

const s3Client = new AWS.S3({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  }
})

export default s3Client
