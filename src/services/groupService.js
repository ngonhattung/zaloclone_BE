import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { conversationModel } from '~/models/conversationModel'
import { groupModel } from '~/models/groupModel.js'
import { messageModel } from '~/models/messageModel'
import { getReceiverSocketId, getUserSocketId, io } from '~/sockets/socket'
import { S3Provider } from '~/providers/S3Provider'
import { userModel } from '~/models/userModel.js'
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

    const allMembers = [...members, { userID }]
    allMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
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
        io.to(participantSocketId).emit('newMember')
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
    //io.to(userSocketId).emit('delConversation', conversation)
    io.to(userSocketId).emit('notification')

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId && member.memberID !== userID) {
        io.to(participantSocketId).emit('updateGroupChat', conversation)
        io.to(participantSocketId).emit('leaveMember', conversation)
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

    // Kiểm tra quyền admin hay phó nhóm
    const isAdmin = groupMembers.some(
      (member) => member.userID === userID && member.role === 'admin'
    )

    const isDeputy = groupMembers.some(
      (member) => member.userID === userID && member.role === 'deputy'
    )

    if (!isAdmin && !isDeputy) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể kích thành viên khi không phải là admin hoặc phó nhóm'
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

    // Gửi thông báo đến người bị kick
    const removeSocketId = getReceiverSocketId(memberID)
    if (removeSocketId) {
      io.to(removeSocketId).emit('kickedFromGroup', {
        ...conversation,
        memberID
      })
      io.to(removeSocketId).emit('notification')
    }

    // Gửi thông báo đến các thành viên còn lại
    groupMembers
      .filter((m) => m.userID !== memberID)
      .forEach((member) => {
        const socketId = getReceiverSocketId(member.userID)
        if (socketId) {
          io.to(socketId).emit('memberKicked')
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
    const allMembers = [...groupMembers, { userID }]
    allMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
        io.to(participantSocketId).emit('groupDeleted', groupID)
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
        io.to(participantSocketId).emit('grantAdmin')
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
    } else if (conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
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
      senderID: userID,
      lastMessage: createNewMessage.messageID
    }

    const updateLastMessagePromise = groupMembers.map((member) =>
      conversationModel.updateLastMessage(member.userID, userConversation)
    )

    await Promise.all(updateLastMessagePromise)

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('newMessageGroup', {
          conversationID: groupID
        })
        io.to(participantSocketId).emit('notification')
      }
    })
    return messageData
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
    } else if (conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    }

    //Lưu message vào database
    const saveMessage = async (uploadResults) => {
      try {
        const messageData = {
          conversationID: conversation.conversationID,
          senderID: userID,
          content: JSON.stringify(
            uploadResults.map((file) => file.originalname)
          ), // Mảng tên file
          url: JSON.stringify(uploadResults.map((file) => file.Location)), // Mảng URL
          type: JSON.stringify(
            uploadResults.map((file) => {
              const parts = file.originalname.split('.')
              return parts.length > 1 ? parts[parts.length - 1] : 'unknown'
            })
          ) // Mảng loại file
        }

        return await messageModel.createNewMessage(messageData)
      } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error)
      }
    }

    const promiseUpload = files.map(async (file) => {
      const s3Result = await S3Provider.streamUpload(file, userID)
      return {
        ...s3Result,
        originalname: file.originalname
      }
    })

    const uploadResults = await Promise.all(promiseUpload)
    const messageResults = await saveMessage(uploadResults)

    if (messageResults) {
      const userConversation = {
        conversationID: conversation.conversationID,
        senderID: userID,
        lastMessage: messageResults.messageID
      }

      const updateLastMessagePromise = groupMembers.map((member) =>
        conversationModel.updateLastMessage(member.userID, userConversation)
      )
      await Promise.all(updateLastMessagePromise)

      // gửi thông báo cho các thành viên trong nhóm
      groupMembers.forEach((member) => {
        const participantSocketId = getReceiverSocketId(member.memberID)
        if (participantSocketId) {
          io.to(participantSocketId).emit('newMessageGroup', {
            conversationID: groupID
          })
          io.to(participantSocketId).emit('notification')
        }
      })
    }
    return messageResults
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
    } else if (conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    }

    const message = await messageModel.findMessageByID(messageID, groupID)
    if (!message) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin nhắn không tồn tại')
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền thu hồi tin nhắn này'
      )
    }

    if (message.senderDelete === true) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể thu hồi tin nhắn đã xóa'
      )
    }

    await messageModel.revokeMessage(messageID, groupID)

    const messageAfterRevoke = await messageModel.findMessageByID(
      messageID,
      groupID
    )

    // gửi thông báo cho các thành viên trong nhóm
    io.to(conversation.conversationID).emit(
      'revokeMessageGroup',
      messageAfterRevoke
    )
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('revokeMessageGroup', {
          conversationID: groupID
        })
        io.to(participantSocketId).emit('notification')
      }
    })
    return messageAfterRevoke
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
    } else if (conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    }

    const message = await messageModel.findMessageByID(messageID, groupID)
    if (!message) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tin nhắn không tồn tại')
    }

    if (message.senderID !== userID) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền xóa tin nhắn này'
      )
    }
    if (message.revoke === true) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không thể xóa tin nhắn đã thu hồi'
      )
    }

    await messageModel.deleteMessage(messageID, groupID)
    const messageAfterDelete = await messageModel.findMessageByID(
      messageID,
      groupID
    )

    // gửi thông báo cho các thành viên trong nhóm
    io.to(conversation.conversationID).emit(
      'deleteMessageGroup',
      messageAfterDelete
    )
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('deleteMessageGroup', {
          conversationID: groupID
        })
        io.to(participantSocketId).emit('notification')
      }
    })
    return messageAfterDelete
  } catch (error) {
    throw error
  }
}

const shareMessage = async (
  userID,
  messageID,
  groupIDs,
  receiverIds,
  conversationID
) => {
  try {
    const message = await messageModel.findMessageByID(
      messageID,
      conversationID
    )
    if (!message) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Message not found. Cannot share message'
      )
    }

    const results = []
    const errors = []

    if (receiverIds && receiverIds.length > 0) {
      const individualResults = await shareWithIndividuals(
        userID,
        receiverIds,
        message
      )
      results.push(...individualResults.results)
      errors.push(...individualResults.errors)
    }

    if (groupIDs && groupIDs.length > 0) {
      const groupResults = await shareWithGroups(userID, groupIDs, message)
      results.push(...groupResults)
    }

    return results
  } catch (error) {
    throw error
  }
}

//Hàm chia sẽ tin nhắn cho cá nhân
const shareWithIndividuals = async (userID, receiverIds, message) => {
  const results = []
  const errors = []

  receiverIds = receiverIds.filter((id) => id !== userID)
  if (receiverIds.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No valid receivers to share message'
    )
  }

  const userSocketID = getUserSocketId(userID)

  for (const receiverId of receiverIds) {
    try {
      const receiverSocketID = getReceiverSocketId(receiverId)
      const existingConversation = await conversationModel.haveTheyChatted(
        userID,
        receiverId
      )

      if (existingConversation?.convDetails) {
        const conversation = existingConversation.convDetails
        const newMessage = await createMessage(
          userID,
          conversation.conversationID,
          message
        )
        const userConversation = {
          conversationID: conversation.conversationID,
          senderID: userID,
          lastMessage: newMessage.messageID
        }

        await Promise.all([
          conversationModel.updateLastMessage(userID, userConversation),
          conversationModel.updateLastMessage(receiverId, userConversation)
        ])

        if (userSocketID) io.to(userSocketID).emit('notification')
        if (receiverSocketID && userSocketID) {
          io.to(receiverSocketID)
            .to(userSocketID)
            .emit('newMessage', newMessage)
          io.to(receiverSocketID).emit('notification')
        }

        results.push({ conversation, createNewMessage: newMessage })
      } else {
        const [userCurrent, receiver] = await Promise.all([
          userModel.getUserById(userID),
          userModel.getUserById(receiverId)
        ])
        if (!userCurrent || !receiver) {
          throw new ApiError(
            StatusCodes.NOT_FOUND,
            'User or receiver not found'
          )
        }

        const newConversation = await conversationModel.createNewConversation(
          'single'
        )
        const newMessage = await createMessage(
          userID,
          newConversation.conversationID,
          message
        )

        const userConversation = {
          conversationID: newConversation.conversationID,
          senderID: userID,
          lastMessage: newMessage.messageID
        }

        await Promise.all([
          conversationModel.addUserToConversation(userID, userConversation),
          conversationModel.addUserToConversation(receiverId, userConversation)
        ])

        if (userSocketID)
          io.to(userSocketID).emit('newConversation', newConversation)
        if (receiverSocketID && userSocketID) {
          io.to(receiverSocketID)
            .to(userSocketID)
            .emit('newMessage', newMessage)
        }

        results.push({
          createConversation: newConversation,
          createNewMessage: newMessage
        })
      }
    } catch (error) {
      errors.push({ receiverId, error: error.message })
    }
  }

  return { results, errors }
}

//Hàm chia sẽ tin nhắn cho nhóm
const shareWithGroups = async (userID, groupIDs, message) => {
  const results = []

  for (const groupID of groupIDs) {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation || conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không hợp lệ'
      )
    }

    const newMessage = await createMessage(
      userID,
      conversation.conversationID,
      message
    )
    const userConversation = {
      conversationID: conversation.conversationID,
      senderID: userID,
      lastMessage: newMessage.messageID
    }

    await Promise.all(
      groupMembers.map((member) =>
        conversationModel.updateLastMessage(member.userID, userConversation)
      )
    )

    io.to(conversation.conversationID).emit('shareMessageGroup', message)
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('notification')
      }
    })

    results.push({ conversation, createNewMessage: newMessage })
  }

  return results
}

//Tạo tin nhắn mới
const createMessage = async (senderID, conversationID, message) => {
  const messageData = {
    conversationID,
    senderID,
    content: message.messageContent,
    url: message.messageUrl,
    type: message.messageType
  }
  return await messageModel.createNewMessage(messageData)
}

const getMyGroups = async (userID) => {
  try {
    const groups = await groupModel.getMyGroups(userID)
    if (!groups || groups.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không có nhóm nào')
    }
    return groups
  } catch (error) {
    throw error
  }
}

const getAllGroups = async () => {
  try {
    const groups = await groupModel.getAllGroups()
    if (!groups || groups.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không có nhóm nào')
    }
    return groups
  } catch (error) {
    throw error
  }
}

const getGroupInfo = async (groupID) => {
  try {
    const group = await groupModel.getGroupInfo(groupID)
    if (!group || group.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không có nhóm nào')
    }
    return group
  } catch (error) {
    throw error
  }
}

const getMembersInGroup = async (groupID) => {
  try {
    const groupMembers = await groupModel.getMembersInGroup(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không có thành viên nào')
    }
    return groupMembers
  } catch (error) {
    throw error
  }
}

const grantDeputy = async (userID, participantId, groupID) => {
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
        'Bạn không thể chỉ định quyền phó nhóm khi không phải là admin'
      )
    }

    const result = await groupModel.grantDeputy(participantId, groupID)
    if (!result) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Cấp quyền phó nhóm  thất bại'
      )
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('grantDeputy')
        io.to(participantSocketId).emit('notification')
      }
    })

    return {
      msg: 'Cấp quyền phó nhóm  thành công'
    }
  } catch (error) {
    throw error
  }
}

const revokeDeputy = async (userID, participantId, groupID) => {
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
        'Bạn không thể thu hồi quyền phó nhóm khi không phải là admin'
      )
    }

    const isDeputy = groupMembers.some(
      (member) => member.userID === participantId && member.role === 'deputy'
    )

    if (!isDeputy) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Người dùng không phải là phó nhóm'
      )
    }

    const result = await groupModel.revokeDeputy(participantId, groupID)
    if (!result) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Thu hồi quyền phó nhóm thất bại'
      )
    }

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('revokeDeputy')
        io.to(participantSocketId).emit('notification')
      }
    })

    return {
      msg: 'Thu hồi quyền phó nhóm thành công'
    }
  } catch (error) {
    throw error
  }
}

const replyMessage = async (userID, replyMessageID, groupID, message) => {
  try {
    const groupMembers = await groupModel.findGroupMembersByID(groupID)
    if (!groupMembers || groupMembers.length === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Nhóm không tồn tại')
    }

    const conversation = await conversationModel.findConversationByID(groupID)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc trò chuyện không tồn tại')
    } else if (conversation.conversationType !== 'group') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cuộc trò chuyện không phải là nhóm'
      )
    }

    const messageReply = await messageModel.findMessageByID(
      replyMessageID,
      groupID
    )

    const messageData = {
      conversationID: conversation.conversationID,
      senderID: userID,
      content: message,
      url: messageReply.messageUrl || null,
      type: messageReply.messageType || 'text',
      reply: messageReply.messageID
    }

    const createNewMessage = await messageModel.createNewMessage(messageData)
    const userConversation = {
      conversationID: conversation.conversationID,
      senderID: userID,
      lastMessage: createNewMessage.messageID
    }

    const updateLastMessagePromise = groupMembers.map((member) =>
      conversationModel.updateLastMessage(member.userID, userConversation)
    )

    await Promise.all(updateLastMessagePromise)

    // gửi thông báo cho các thành viên trong nhóm
    groupMembers.forEach((member) => {
      const participantSocketId = getReceiverSocketId(member.memberID)
      if (participantSocketId) {
        io.to(participantSocketId).emit('newMessageGroup', {
          conversationID: groupID
        })
        io.to(participantSocketId).emit('notification')
      }
    })

    return messageData
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
  shareMessage,
  getMyGroups,
  getAllGroups,
  getGroupInfo,
  getMembersInGroup,
  grantDeputy,
  revokeDeputy,
  replyMessage
}
