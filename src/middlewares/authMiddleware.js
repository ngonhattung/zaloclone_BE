import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

//Middle ware kiểm tra token
const isAuthorized = async (req, res, next) => {
  let accessToken = req.headers.authorization
  if (!accessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token is required'))
    return
  }
  if (accessToken.startsWith('Bearer ')) {
    accessToken = accessToken.split(' ')[1]
  } else {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token format'))
  }
  try {
    const decoded = JwtProvider.verifyToken(
      accessToken,
      env.ACCESS_TOKEN_SECRET
    )
    req.jwtDecoded = decoded
    next()
  } catch (error) {
    console.log('middleware error', error)
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
