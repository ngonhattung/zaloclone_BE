import { StatusCodes } from 'http-status-codes'
import { groupService } from '~/services/groupService'
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

export const groupController = {
  createGroup
}
