import { StatusCodes } from 'http-status-codes'
import { groupService } from '~/services/groupService.js'
import ApiError from '~/utils/ApiError'

const createGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupName, members } = req.body
    const groupAvatar = req.file

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
    const userID = req.jwtDecoded.userID
    const { groupID, members } = req.body // mảng id của các thành viên trong nhóm
    const result = await groupService.inviteGroup(userID, groupID, members)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const leaveGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID } = req.body

    const result = await groupService.leaveGroup(userID, groupID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const kickMember = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID, memberID } = req.body
    const result = await groupService.kickMember(userID, groupID, memberID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const deleteGroup = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID } = req.body

    const result = await groupService.deleteGroup(userID, groupID)

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
    const { message, groupID } = req.body
    const result = await groupService.sendMessage(userID, message, groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const sendFiles = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { groupID } = req.body
    const files = req.files // mảng các file đã được upload
    const result = await groupService.sendFiles(userID, files, groupID)

    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const revokeMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, groupID } = req.body
    const result = await groupService.revokeMessage(userID, messageID, groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const deleteMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, groupID } = req.body
    const result = await groupService.deleteMessage(userID, messageID, groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const shareMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { messageID, groupIDs, receiverIds, conversationID } = req.body
    const result = await groupService.shareMessage(
      userID,
      messageID,
      groupIDs,
      receiverIds,
      conversationID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getMyGroups = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const result = await groupService.getMyGroups(userID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getAllGroups = async (req, res, next) => {
  try {
    const result = await groupService.getAllGroups()
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getGroupInfo = async (req, res, next) => {
  try {
    const { groupID } = req.params
    const result = await groupService.getGroupInfo(groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const getMembersInGroup = async (req, res, next) => {
  try {
    const { groupID } = req.params
    const result = await groupService.getMembersInGroup(groupID)
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const grantDeputy = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { participantId, groupID } = req.body
    const result = await groupService.grantDeputy(
      userID,
      participantId,
      groupID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}
const revokeDeputy = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { participantId, groupID } = req.body
    const result = await groupService.revokeDeputy(
      userID,
      participantId,
      groupID
    )
    //Có kết quả trả về client
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

const replyMessage = async (req, res, next) => {
  try {
    const userID = req.jwtDecoded.userID
    const { replyMessageID, groupID, message } = req.body
    const result = await groupService.replyMessage(
      userID,
      replyMessageID,
      groupID,
      message
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
  revokeMessage,
  deleteMessage,
  shareMessage,
  getMyGroups,
  getAllGroups,
  getGroupInfo,
  getMembersInGroup,
  grantDeputy,
  revokeDeputy,
  replyMessage
}
