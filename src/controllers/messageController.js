import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ApiError from '~/utils/ApiError'

const sendMessage = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const { message } = req.body

    const result = await userService.sendMessage(userID, receiverId, message)
    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}
const sendImages = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const images = req.files
    const result = await userService.sendImages(userID, receiverId, images)
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const sendFiles = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const files = req.files

    const result = await userService.sendFiles(userID, receiverId, files)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const sendVideos = async (req, res, next) => {
  try {
    const { receiverId } = req.params
    const userID = req.jwtDecoded.userID
    const videos = req.files
    const result = await userService.sendVideos(userID, receiverId, videos)

    //Có kết quả trả về client
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

export const messageController = {
  sendMessage,
  sendImages,
  sendFiles,
  sendVideos
}
