import s3Client from '~/config/s3'

const streamUpload = (file, userId) => {
  const fileParts = file.originalname.split('.')
  const fileType = fileParts[fileParts.length - 1]
  const fileName = `${userId}_${Date.now().toString()}.${fileType}`
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype
  }
  return s3Client.upload(params).promise()
}

export const S3Provider = { streamUpload }
