import JWT from 'jsonwebtoken'

const generateToken = async (userInfo, secretKey, tokenLife) => {
  try {
    return JWT.sign(userInfo, secretKey, {
      algorithm: 'HS256', // default: HS256
      expiresIn: tokenLife
    })
  } catch (error) {
    throw new Error(error)
  }
}

const verifyToken = async (token, secretKey) => {
  try {
    return JWT.verify(token, secretKey)
  } catch (error) {
    throw new Error(error)
  }
}

export const JwtProvider = {
  generateToken,
  verifyToken
}
