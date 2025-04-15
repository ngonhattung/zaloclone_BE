import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { messageModel } from './messageModel'
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
        return { convDetails } // Trả về thông tin conversation
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
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Item: {
        userID: userID,
        conversationID: userConversation.conversationID,
        conversationName: userConversation.conversationName,
        conversationAvatar: userConversation.conversationAvatar,
        lastMessageID: userConversation.lastMessage,
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

const updateLastMessage = async (userID, userConversation) => {
  try {
    const params = {
      TableName: USERCONVERSATION_TABLE_NAME,
      Key: {
        userID: userID,
        conversationID: userConversation.conversationID
      },
      UpdateExpression:
        'set lastMessageID = :lastMessage, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':lastMessage': userConversation.lastMessage,
        ':updatedAt': Date.now()
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
        ExpressionAttributeValues: {
          ':userID': userID
        },
        ScanIndexForward: false // sắp xếp giảm dần (mới nhất trước)
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return [] // Không có cuộc trò chuyện nào
    }

    console.log('result.Items', result.Items)

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

    console.log('messageMap', messageMap)
    // Kết hợp dữ liệu
    const conversations = result.Items.map((item) => ({
      conversation: item,
      lastMessage: messageMap[item.lastMessageID] || null
    }))
    console.log('Conversations:', conversations)
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
                updatedAt: null
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
                updatedAt: null
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
              updatedAt: null
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
      },
      UpdateExpression: 'set destroy = :destroy',
      ExpressionAttributeValues: {
        ':destroy': true
      }
    }
    await dynamoClient.update(params).promise()
    return { message: 'Left group successfully' }
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
  leaveGroup
}
