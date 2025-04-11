import { StatusCodes } from 'http-status-codes'
import { groupService } from '~/services/groupService.js'
import ApiError from '~/utils/ApiError'

const createGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupName, groupAvatar } = req.body
    const members = req.body.members // mảng id của các thành viên trong nhóm
    const result = await groupService.createGroup(
      userID,
      groupName,
      groupAvatar,
      members
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const inviteGroup = async (req, res, next) => {
  try {
    const { groupID, members, conversationID } = req.body // mảng id của các thành viên trong nhóm
    const result = await groupService.inviteGroup(
      groupID,
      members,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const leaveGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID, conversationID } = req.body

    const result = await groupService.leaveGroup(
      userID,
      groupID,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const kickMember = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID, conversationID, memberID } = req.body
    const result = await groupService.kickMember(
      userID,
      groupID,
      conversationID,
      memberID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const deleteGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID, conversationID } = req.body

    const result = await groupService.deleteGroup(
      userID,
      groupID,
      conversationID
    )

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const grantAdmin = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { participantId, groupID } = req.body
    const result = await groupService.grantAdmin(userID, participantId, groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const sendMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { message, conversationId, groupID } = req.body
    const result = await groupService.sendMessage(
      userID,
      conversationId,
      message,
      groupID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const sendFiles = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { conversationId, groupID } = req.params
    const files = req.files // mảng các file đã được upload
    const result = await groupService.sendFiles(
      userID,
      conversationId,
      files,
      groupID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const revokeMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, conversationID, groupID } = req.body
    const result = await groupService.revokeMessage(
      userID,
      conversationID,
      messageID,
      groupID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const groupController = {
  createGroup,
  inviteGroup,
  leaveGroup,
  kickMember,
  deleteGroup,
  grantAdmin,
  sendMessage,
  sendFiles,
  revokeMessage
}
