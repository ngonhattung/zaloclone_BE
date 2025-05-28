import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { messageModel } from './messageModel'
import { userModel } from './userModel'
const CONVERSATION_TABLE_NAME = 'conversations'
const USERCONVERSATION_TABLE_NAME = 'userConversations'
const haveTheyChatted = async (userID, receiverId) => {
  try {
    const convUser = await dynamoClient
      .query({
        TableName: USERCONVERSATION_TABLE_NAME,
        KeyConditionExpression: 'userID = :userID',
        ExpressionAttributeValues: { ':userID': userID }
      })
      .promise()

    // Lấy danh sách các cuộc hội thoại của receiverId
    const convReceiver = await dynamoClient
      .query({
        TableName: USERCONVERSATION_TABLE_NAME,
        KeyConditionExpression: 'userID = :receiverId',
        ExpressionAttributeValues: { ':receiverId': receiverId }
      })
      .promise()

    // Chuyển đổi danh sách cuộc hội thoại thành Map để dễ dàng tìm kiếm
    const convSetUser = new Map(
      convUser.Items.map((item) => [item.conversationID, item])
    )
    const convSetReceiver = new Map(
      convReceiver.Items.map((item) => [item.conversationID, item])
    )

    for (let [convId, convDetails] of convSetUser) {
      if (convSetReceiver.has(convId)) {
        const conversationData = await findConversationByID(convId)
        if (!conversationData) {
          continue
        }

        if (
          conversationData &&
          conversationData.conversationType === 'single'
        ) {
          return { convDetails } // Trả về thông tin conversation
        }
      }
    }
    return null
  } catch (error) {
    throw error
  }
}

const createNewConversation = async (conversationType) => {
  try {
    const conversationID = uuidv4()

    const info = {
      conversationID,
      conversationType: conversationType,
      destroy: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const params = {
      TableName: CONVERSATION_TABLE_NAME,
      Item: info
    }

    await dynamoClient.put(params).promise()

    return info
  } catch (error) {
    throw error
  }
}

const addUserToConversation = async (userID, userConversation) => {
  const isSender = userID === userConversation.senderID
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Item: {
        userID: userID,
        conversationID: userConversation.conversationID,
        lastMessageID: userConversation.lastMessage,
        isSeenMessage: isSender, // Nếu người dùng là người gửi thì đánh dấu là đã xem
        destroy: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }
    await dynamoClient.put(params).promise()
    return userConversation
  } catch (error) {
    throw error
  }
}

const updateStateSeen = async (conversationID, userID) => {
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Key: {
        userID: userID,
        conversationID: conversationID
      },
      UpdateExpression: 'set isSeenMessage = :isSeenMessage',
      ExpressionAttributeValues: {
        ':isSeenMessage': true
      }
    }
    await dynamoClient.update(params).promise()
    return { message: 'State seen updated successfully' }
  } catch (error) {
    throw error
  }
}

// const updateLastMessage = async (userID, userConversation) => {
//   try {
//     const params = {
//       TableName: USERCONVERSATION_TABLE_NAME,
//       Key: {
//         userID: userID,
//         conversationID: userConversation.conversationID
//       },
//       UpdateExpression:
//         'set lastMessageID = :lastMessage, updatedAt = :updatedAt',
//       ExpressionAttributeValues: {
//         ':lastMessage': userConversation.lastMessage,
//         ':updatedAt': Date.now()
//       }
//     }
//     await dynamoClient.update(params).promise()
//     return userConversation
//   } catch (error) {
//     throw error
//   }
// }
const updateLastMessage = async (userID, userConversation) => {
  try {
    const isSender = userID === userConversation.senderID

    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Key: {
        userID: userID,
        conversationID: userConversation.conversationID
      },
      UpdateExpression:
        'set lastMessageID = :lastMessage, updatedAt = :updatedAt, isSeenMessage = :isSeen',
      ExpressionAttributeValues: {
        ':lastMessage': userConversation.lastMessage,
        ':updatedAt': Date.now(),
        ':isSeen': isSender
      }
    }

    await dynamoClient.update(params).promise()
    return userConversation
  } catch (error) {
    throw error
  }
}
const findConversationByID = async (conversationID) => {
  try {
    const params = {
      TableName: CONVERSATION_TABLE_NAME,
      Key: {
        conversationID
      }
    }
    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}

const getConversations = async (userID) => {
  try {
    const result = await dynamoClient
      .query({
        TableName: USERCONVERSATION_TABLE_NAME,
        IndexName: 'UserUpdatedAtIndex',
        KeyConditionExpression: 'userID = :userID',
        FilterExpression: 'destroy = :destroyValue',
        ExpressionAttributeValues: {
          ':userID': userID,
          ':destroyValue': false
        },
        ScanIndexForward: false // sắp xếp giảm dần (mới nhất trước)
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return [] // Không có cuộc trò chuyện nào
    }

    const conversationIDs = result.Items.map(
      (item) => item.conversationID
    ).filter((id) => id)

    // Truy vấn tất cả cuộc trò chuyện
    let conversationMap = {}
    if (conversationIDs.length > 0) {
      const conversationKeys = result.Items.map((item) => ({
        conversationID: item.conversationID
      })).filter((key) => key.conversationID)

      const conversationData = await dynamoClient
        .batchGet({
          RequestItems: {
            [CONVERSATION_TABLE_NAME]: {
              Keys: conversationKeys
            }
          }
        })
        .promise()

      // Chuyển thành Map để truy xuất nhanh
      conversationMap = (
        conversationData.Responses[CONVERSATION_TABLE_NAME] || []
      ).reduce((acc, conv) => {
        acc[conv.conversationID] = conv
        return acc
      }, {})
    }

    const lastMessageIDs = result.Items.map(
      (item) => item.lastMessageID
    ).filter((id) => id)

    // Truy vấn tất cả tin nhắn
    let messageMap = {}
    if (lastMessageIDs.length > 0) {
      const messageKeys = result.Items.map((item) => ({
        conversationID: item.conversationID,
        messageID: item.lastMessageID
      })).filter((key) => key.conversationID && key.messageID)

      const messageData = await dynamoClient
        .batchGet({
          RequestItems: {
            [messageModel.MESSAGE_TABLE_NAME]: {
              Keys: messageKeys
            }
          }
        })
        .promise()

      // Chuyển thành Map để truy xuất nhanh
      messageMap = (
        messageData.Responses[messageModel.MESSAGE_TABLE_NAME] || []
      ).reduce((acc, msg) => {
        acc[msg.messageID] = msg
        return acc
      }, {})
    }

    // Kết hợp dữ liệu
    const conversations = result.Items.map((item) => ({
      conversation: {
        ...item,
        conversationType: conversationMap[item.conversationID]
          ? conversationMap[item.conversationID].conversationType
          : null
      },
      lastMessage: messageMap[item.lastMessageID] || null
    }))
    return conversations
  } catch (error) {
    throw error
  }
}

const getConversationsNoSeen = async (userID) => {
  try {
    const result = await dynamoClient
      .query({
        TableName: USERCONVERSATION_TABLE_NAME,
        IndexName: 'UserUpdatedAtIndex',
        KeyConditionExpression: 'userID = :userID',
        FilterExpression:
          'destroy = :destroyValue and isSeenMessage = :isSeenMessage',
        ExpressionAttributeValues: {
          ':userID': userID,
          ':destroyValue': false,
          ':isSeenMessage': false
        },
        ScanIndexForward: false // sắp xếp giảm dần (mới nhất trước)
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return [] // Không có cuộc trò chuyện nào
    }

    const conversationIDs = result.Items.map(
      (item) => item.conversationID
    ).filter((id) => id)

    // Truy vấn tất cả cuộc trò chuyện
    let conversationMap = {}
    if (conversationIDs.length > 0) {
      const conversationKeys = result.Items.map((item) => ({
        conversationID: item.conversationID
      })).filter((key) => key.conversationID)

      const conversationData = await dynamoClient
        .batchGet({
          RequestItems: {
            [CONVERSATION_TABLE_NAME]: {
              Keys: conversationKeys
            }
          }
        })
        .promise()

      // Chuyển thành Map để truy xuất nhanh
      conversationMap = (
        conversationData.Responses[CONVERSATION_TABLE_NAME] || []
      ).reduce((acc, conv) => {
        acc[conv.conversationID] = conv
        return acc
      }, {})
    }

    const lastMessageIDs = result.Items.map(
      (item) => item.lastMessageID
    ).filter((id) => id)

    // Truy vấn tất cả tin nhắn
    let messageMap = {}
    if (lastMessageIDs.length > 0) {
      const messageKeys = result.Items.map((item) => ({
        conversationID: item.conversationID,
        messageID: item.lastMessageID
      })).filter((key) => key.conversationID && key.messageID)

      const messageData = await dynamoClient
        .batchGet({
          RequestItems: {
            [messageModel.MESSAGE_TABLE_NAME]: {
              Keys: messageKeys
            }
          }
        })
        .promise()

      // Chuyển thành Map để truy xuất nhanh
      messageMap = (
        messageData.Responses[messageModel.MESSAGE_TABLE_NAME] || []
      ).reduce((acc, msg) => {
        acc[msg.messageID] = msg
        return acc
      }, {})
    }

    // Kết hợp dữ liệu
    const conversations = result.Items.map((item) => ({
      conversation: {
        ...item,
        conversationType: conversationMap[item.conversationID]
          ? conversationMap[item.conversationID].conversationType
          : null
      },
      lastMessage: messageMap[item.lastMessageID] || null
    }))
    return conversations
  } catch (error) {
    throw error
  }
}
const getConversationByName = async (conversationName) => {
  try {
    const result = await dynamoClient
      .scan({
        TableName: CONVERSATION_TABLE_NAME,
        FilterExpression: 'contains(conversationName, :conversationName)',
        ExpressionAttributeValues: { ':conversationName': conversationName }
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return null
    }

    return result.Items
  } catch (error) {
    throw error
  }
}

const getReceiverByConversationId = async (userID, conversationId) => {
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      IndexName: 'ConversationIdIndex',
      KeyConditionExpression: 'conversationID = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    }

    const result = await dynamoClient.query(params).promise()

    if (!result.Items || result.Items.length === 0) {
      return null
    }

    const receiver = result.Items.find((item) => item.userID !== userID)

    const receiverData = await userModel.findOneById(receiver.userID)

    return receiverData
  } catch (error) {
    throw error
  }
}
//Group

const createUserConversationGroup = async (userID, conversationID, members) => {
  try {
    const params = {
      RequestItems: {
        [USERCONVERSATION_TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                userID: userID,
                conversationID: conversationID,
                lastMessageID: null,
                destroy: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
              }
            }
          },
          ...members.map((member) => ({
            PutRequest: {
              Item: {
                userID: member,
                conversationID: conversationID,
                lastMessageID: null,
                destroy: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
              }
            }
          }))
        ]
      }
    }

    await dynamoClient.batchWrite(params).promise()
    return { conversationID, members }
  } catch (error) {
    throw error
  }
}

const addMembers = async (conversationID, members) => {
  try {
    const params = {
      RequestItems: {
        [USERCONVERSATION_TABLE_NAME]: members.map((member) => ({
          PutRequest: {
            Item: {
              userID: member,
              conversationID: conversationID,
              lastMessageID: null,
              destroy: false,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          }
        }))
      }
    }

    await dynamoClient.batchWrite(params).promise()
    return { conversationID, members }
  } catch (error) {
    throw error
  }
}

const leaveGroup = async (userID, conversationID) => {
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Key: {
        userID: userID,
        conversationID: conversationID
      }
    }

    await dynamoClient.delete(params).promise()
    return { message: 'Left group successfully' }
  } catch (error) {
    throw error
  }
}

const deleteConversation = async (conversationID) => {
  try {
    const params = {
      TableName: CONVERSATION_TABLE_NAME,
      Key: {
        conversationID: conversationID
      }
    }

    await dynamoClient.delete(params).promise()
    return { message: 'Conversation deleted successfully' }
  } catch (error) {
    throw error
  }
}
export const conversationModel = {
  CONVERSATION_TABLE_NAME,
  haveTheyChatted,
  createNewConversation,
  addUserToConversation,
  updateLastMessage,
  findConversationByID,
  getConversations,
  getConversationByName,
  addMembers,
  createUserConversationGroup,
  leaveGroup,
  getReceiverByConversationId,
  deleteConversation,
  updateStateSeen,
  getConversationsNoSeen
}
