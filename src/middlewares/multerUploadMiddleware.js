import multer from 'multer'
import {
  ALLOW_COMMON_FILE_TYPE,
  LIMIT_COMMON_FILE_SIZE
} from '~/utils/validators'

const customFileFilter = (req, file, callback) => {
  if (!ALLOW_COMMON_FILE_TYPE.includes(file.mimetype)) {
    const errorMessage = `File type ${file.mimetype} is not supported`
    return callback(new Error(errorMessage), null)
  }

  return callback(null, true)
}

//Khởi tạo function upload được bọc bởi multer

const upload = multer({
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter
})

export const multerUploadMiddleware = { upload }
