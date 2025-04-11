import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { groupModel } from '~/models/groupModel.js'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/sockets/socket'
import { S3Provider } from '~/providers/S3Provider'
import { userModel } from '~/models/userModel'

const createGroup = async (userID, groupName, groupAvatar, members) => {
  try {
    const conversation = await conversationModel.create(groupName, 'group')
    if (!conversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Tạo nhóm thất bại vào cuộc trò chuyện'
      )
    }

    // cập nhật danh sách thành viên cho cuộc trò chuyện
    const userConversation =
      await conversationModel.createUserConversationGroup(
        userID,
        conversation.conversationID,
        members
      )
    if (!userConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thêm thành viên thất bại vào cuộc trò chuyện'
      )
    }

    const group = await groupModel.create(groupName, groupAvatar)
    if (!group) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Tạo nhóm thất bại')
    }

    const groupMembers = await groupModel.createGroupMembers(
      userID,
      group.groupID,
      members
    )
    if (!groupMembers) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thêm thành viên thất bại'
      )
    }

    members.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member)
      if (participantSocketId) {
        io.to(participantSocketId).emit('newConversation', conversation)
      }
    })

    return {
      msg: conversation
    }
  } catch (error) {
    throw error
  }
}

const inviteGroup = async (groupID, members, conversationID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(
      conversationID
    )
    // thêm thành viên vào nhóm

    const userConversation = await conversationModel.addMembers(
      conversation.conversationID,
      members
    )
    if (!userConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thêm thành viên thất bại vào cuộc trò chuyện'
      )
    }

    const result = await groupModel.addMembers(groupID, members)
    if (!result) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thêm thành viên thất bại'
      )
    }

    //gửi conversation mới cho các thành viên mới tham gia nhóm
    members.forEach((member) => {
      const participantSocketAddId = getReceiverSocketId(member)
      if (participantSocketAddId) {
        io.to(participantSocketAddId).emit('newConversation', conversation)
      }
    })

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('notification')
      }
    })
    return {
      msg: conversation
    }
  } catch (error) {
    throw error
  }
}

const leaveGroup = async (userID, groupID, conversationID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    // kiểm tra xem người dùng có phải là admin không
    groupMembers.forEach((member) => {
      if (member.memberID === userID && member.role === 'admin') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Bạn không thể rời nhóm khi là admin'
        )
      }
    })
    const conversation = await conversationModel.findConversationByID(
      conversationID
    )
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    const userConversation = await conversationModel.leaveGroup(
      conversation.conversationID,
      userID
    )
    if (!userConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Rời nhóm thất bại vào cuộc trò chuyện'
      )
    }

    const result = await groupModel.leaveGroup(userID, groupID)
    if (!result) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Rời nhóm thất bại')
    }

    //gửi thông báo tới người rời nhóm
    const removeParticipantSocketId = getReceiverSocketId(userID)
    if (removeParticipantSocketId) {
      io.to(removeParticipantSocketId).emit('delConversation', conversation)
      io.to(removeParticipantSocketId).emit('remove')
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID !== userID) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('notification')
      }
    })

    return {
      msg: conversation
    }
  } catch (error) {
    throw error
  }
}

const kickMember = async (userID, groupID, conversationID, memberID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    // kiểm tra xem người dùng có phải là admin không
    groupMembers.forEach((member) => {
      if (member.memberID === userID && member.role === 'admin') {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Bạn không thể kích thành viên nếu không phải là admin'
        )
      }
    })
    const conversation = await conversationModel.findConversationByID(
      conversationID
    )
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    const userConversation = await conversationModel.leaveGroup({
      conversationID: conversation.conversationID,
      userID: memberID
    })
    if (!userConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Rời nhóm thất bại vào cuộc trò chuyện'
      )
    }

    const result = await groupModel.leaveGroup({
      userID: memberID,
      groupID
    })
    if (!result) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Rời nhóm thất bại')
    }

    //gửi thông báo tới người rời nhóm
    const removeParticipantSocketId = getReceiverSocketId(memberID)
    if (removeParticipantSocketId) {
      io.to(removeParticipantSocketId).emit('delConversation', conversation)
      io.to(removeParticipantSocketId).emit('remove')
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID !== memberID) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('notification')
      }
    })

    return {
      msg: conversation
    }
  } catch (error) {
    throw error
  }
}
export const messageService = {
  createGroup,
  inviteGroup,
  leaveGroup,
  kickMember
}
