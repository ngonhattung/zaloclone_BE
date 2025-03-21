import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

//Middle ware kiểm tra token
const isAuthorized = async (req, res, next) => {
  let accessToken = req.cookies?.accessToken
  if (!accessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token is required'))
    return
  }
  try {
    const decoded = await JwtProvider.verifyToken(
      accessToken,
      env.ACCESS_TOKEN_SECRET
    )
    //Lưu thông tin user vào req sau khi giải mã
    req.jwtDecoded = decoded
    next()
  } catch (error) {
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need to refresh token'))
      return
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED!'))
  }
}

export const authMiddleware = {
  isAuthorized
}
