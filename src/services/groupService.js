import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { groupModel } from '~/models/groupModel.js'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/sockets/socket'
import { S3Provider } from '~/providers/S3Provider'

const createGroup = async (userID, groupName, groupAvatar, members) => {
  try {
    const conversation = await conversationModel.createNewConversation('group')
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

    const uploadResult = await S3Provider.streamUpload(groupAvatar, userID)
    const group = await groupModel.create(
      conversation.conversationID,
      groupName,
      uploadResult.Location
    )
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

    return conversation
  } catch (error) {
    throw error
  }
}

const inviteGroup = async (groupID, members) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

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

const leaveGroup = async (userID, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    // Kiểm tra quyền admin
    const adminMembers = groupMembers.filter(
      (member) => member.role === 'admin'
    )

    const isOnlyAdmin =
      adminMembers.length === 1 && adminMembers[0].userID === userID

    if (isOnlyAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể rời nhóm vì bạn là admin duy nhất'
      )
    }

    const userConversation = await conversationModel.leaveGroup(
      userID,
      conversation.conversationID
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
    const userSocketId = getUserSocketId(userID)
    io.to(userSocketId).emit('delConversation', conversation)

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID !== userID) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('notification')
      }
    })

    return conversation
  } catch (error) {
    throw error
  }
}

const kickMember = async (userID, groupID, memberID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    // Kiểm tra quyền admin
    const isAdmin = groupMembers.some(
      (member) => member.userID === userID && member.role === 'admin'
    )
    if (!isAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể xóa thành viên nhóm khi không phải là admin'
      )
    }

    const userConversation = await conversationModel.leaveGroup(
      memberID,
      conversation.conversationID
    )
    if (!userConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Rời nhóm thất bại vào cuộc trò chuyện'
      )
    }

    const result = await groupModel.leaveGroup(memberID, groupID)
    if (!result) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Rời nhóm thất bại')
    }

    //gửi thông báo tới người rời nhóm
    const removeParticipantSocketId = getReceiverSocketId(memberID)
    if (removeParticipantSocketId) {
      io.to(removeParticipantSocketId).emit('delConversation', conversation)
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID !== memberID) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('notification')
      }
    })

    return conversation
  } catch (error) {
    throw error
  }
}

const deleteGroup = async (userID, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    }

    // Kiểm tra quyền admin
    const isAdmin = groupMembers.some(
      (member) => member.userID === userID && member.role === 'admin'
    )
    if (!isAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể giải tán nhóm khi không phải là admin'
      )
    }

    // Xóa thành viên khỏi conversation bằng Promise.all
    const leaveGroupPromises = groupMembers.map((member) =>
      conversationModel.leaveGroup(member.userID, conversation.conversationID)
    )
    const leaveResults = await Promise.all(leaveGroupPromises)

    //Kiểm tra kết quả
    if (leaveResults.includes(null)) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Một số thành viên không thể rời nhóm trò chuyện'
      )
    }

    // Xóa thành viên khỏi nhóm
    const leaveGroupPromises2 = groupMembers.map((member) =>
      groupModel.leaveGroup(member.userID, groupID)
    )

    const leaveResults2 = await Promise.all(leaveGroupPromises2)

    // Kiểm tra kết quả
    if (leaveResults2.includes(null)) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Một số thành viên không thể rời nhóm'
      )
    }

    // Xóa cuộc trò chuyện
    const deleteConversation = await conversationModel.deleteConversation(
      conversation.conversationID
    )

    // Kiểm tra kết quả
    if (!deleteConversation) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Xóa cuộc trò chuyện thất bại'
      )
    }

    // Xóa nhóm
    const result = await groupModel.deleteGroup(groupID)
    if (!result) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Giải tán nhóm thất bại'
      )
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID) {
        io.to(participantSocketId).emit('delConversation', conversation)
        io.to(participantSocketId).emit('remove')
      }
    })

    return conversation
  } catch (error) {
    throw error
  }
}

const grantAdmin = async (userID, participantId, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    // Kiểm tra quyền admin
    const isAdmin = groupMembers.some(
      (member) => member.userID === userID && member.role === 'admin'
    )
    if (!isAdmin) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể chỉ định quyền admin khi không phải là admin'
      )
    }

    const result = await groupModel.grantAdmin(participantId, groupID)
    if (!result) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Cấp quyền admin thất bại'
      )
    }

    const resultRevoke = await groupModel.revokeAdmin(userID, groupID)

    if (!resultRevoke) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thu hồi admin thất bại'
      )
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('updateGroupChat')
        io.to(participantSocketId).emit('notification')
      }
    })

    return {
      msg: 'Cấp quyền admin thành công'
    }
  } catch (error) {
    throw error
  }
}

const sendMessage = async (userID, message, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }
    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    } else if (conversation.type !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    } else if (conversation.isDestroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cuộc trò chuyện đã bị xóa')
    }

    const messageData = {
      conversationID: conversation.conversationID,
      senderID: userID,
      content: message,
      type: 'text'
    }
    const createNewMessage = await messageModel.createNewMessage(messageData)
    const userConversation = {
      conversationID: conversation.conversationID,
      lastMessage: createNewMessage.messageID
    }

    const updateLastMessagePromise = groupMembers.map((member) =>
      conversationModel.updateLastMessage(member.memberID, userConversation)
    )

    await Promise.all(updateLastMessagePromise)

    // gửi thông báo cho các thành viên trong nhóm
    io.to(conversation.conversationID).emit('newMessageGroup', {
      message: createNewMessage,
      conversationID: conversation.conversationID
    })
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
      }
    })
    return {
      msg: messageData
    }
  } catch (error) {
    throw error
  }
}

const sendFiles = async (userID, files, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    } else if (conversation.type !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    } else if (conversation.isDestroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cuộc trò chuyện đã bị xóa')
    }

    const saveMessage = async (result) => {
      try {
        const fileParts = result.originalname.split('.')
        const fileType =
          fileParts.length > 1 ? fileParts[fileParts.length - 1] : 'unknown'

        const messageData = {
          conversationID: conversation.conversationID,
          senderID: userID,
          content: result.originalname,
          url: result.Location,
          type: fileType
        }

        return await messageModel.createNewMessage(messageData)
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    }

    const promiseUpload = files.map((file) =>
      S3Provider.streamUpload(file, userID)
    )

    const uploadResults = await Promise.all(promiseUpload)
    const messageResults = await Promise.all(uploadResults.map(saveMessage))

    if (messageResults) {
      const userConversation = {
        conversationID: conversation.conversationID,
        lastMessage: messageResults[messageResults.length - 1].messageID
      }

      const updateLastMessagePromise = groupMembers.map((member) =>
        conversationModel.updateLastMessage(member.memberID, userConversation)
      )
      await Promise.all(updateLastMessagePromise)

      // gửi thông báo cho các thành viên trong nhóm
      io.to(conversation.conversationID).emit('newMessageGroup', {
        message: messageResults,
        conversationID: conversation.conversationID
      })
      groupMembers.forEach((member) => {
        const participantSocketId = getReceiverSocketId(member.memberID)
        if (participantSocketId) {
          io.to(participantSocketId).emit('notification')
        }
      })
    }
  } catch (error) {
    throw error
  }
}

const revokeMessage = async (userID, messageID, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }
    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    } else if (conversation.type !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    } else if (conversation.isDestroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cuộc trò chuyện đã bị xóa')
    }

    const message = await messageModel.findMessageByID(messageID)
    if (!message) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin nhắn không tồn tại')
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to revoke this message'
      )
    }

    await messageModel.revokeMessage(messageID)

    const messageContent = 'Tin nhắn đã bị thu hồi'

    // gửi thông báo cho các thành viên trong nhóm
    io.to(conversation.conversationID).emit(
      'revokeMessageGroup',
      messageContent
    )
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
      }
    })
    return {
      msg: messageContent
    }
  } catch (error) {
    throw error
  }
}

const deleteMessage = async (userID, messageID, groupID) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    } else if (conversation.type !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    } else if (conversation.isDestroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cuộc trò chuyện đã bị xóa')
    }

    const message = await messageModel.findMessageByID(messageID)
    if (!message) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin nhắn không tồn tại')
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to delete this message'
      )
    }

    await messageModel.deleteMessage(messageID)

    // gửi thông báo cho các thành viên trong nhóm
    io.to(conversation.conversationID).emit('deleteMessageGroup', messageID)
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
      }
    })
  } catch (error) {
    throw error
  }
}

const shareMessage = async (userID, messageID, groupIDs) => {
  try {
    const message = await messageModel.findMessageByID(messageID)
    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot share message'
      )
    }

    const groupSharePromises = groupIDs.map(async (groupID) => {
      const groupMembers = await groupModel.findGroupMembersByID(groupID)
      if (!groupMembers || groupMembers.length === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
      }
      const conversation = await conversationModel.findConversationByID(groupID)
      if (!conversation) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Cuộc trò chuyện không tồn tại'
        )
      }
      if (conversation.type !== 'group') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cuộc trò chuyện không phải là nhóm'
        )
      }
      if (conversation.isDestroy) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cuộc trò chuyện đã bị xóa')
      }

      const messageData = {
        conversationID: conversation.conversationID,
        senderID: userID,
        content: message.messageContent,
        url: message.messageUrl,
        type: message.messageType
      }

      const createNewMessage = await messageModel.createNewMessage(messageData)

      const userConversation = {
        conversationID: conversation.conversationID,
        lastMessage: createNewMessage.messageID
      }

      const updateLastMessagePromise = groupMembers.map((member) =>
        conversationModel.updateLastMessage(member.memberID, userConversation)
      )
      await Promise.all(updateLastMessagePromise)

      // Emit socket
      io.to(conversation.conversationID).emit('shareMessageGroup', message)
      groupMembers.forEach((member) => {
        const participantSocketId = getReceiverSocketId(member.memberID)
        if (participantSocketId) {
          io.to(participantSocketId).emit('notification')
        }
      })
    })

    await Promise.all(groupSharePromises)

    return { msg: message }
  } catch (error) {
    throw error
  }
}

export const groupService = {
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
  shareMessage
}
