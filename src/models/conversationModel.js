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

    const convSetUser = new Map(convUser.Items.map((item) => [item.SK, item]))
    const convSetReceiver = new Map(
      convReceiver.Items.map((item) => [item.SK, item])
    )

    for (let [convId, convDetails] of convSetUser) {
      if (convSetReceiver.has(convId)) {
        console.log('convDetails', convDetails)
        return { conversation: convDetails } // Trả về thông tin conversation
      }
    }
    return null
  } catch (error) {
    throw error
  }
}

const createNewConversation = async (fullName) => {
  try {
    const conversationID = uuidv4()

    const info = {
      conversationID,
      conversationType: 'private',
      conversationName: fullName,
      createdAt: Date.now(),
      updatedAt: null
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
        lastMessageID: userConversation.lastMessage,
        createdAt: Date.now(),
        updatedAt: null
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
        KeyConditionExpression: 'userID = :userID',
        ExpressionAttributeValues: { ':userID': userID }
      })
      .promise()

    if (!result.Items || result.Items.length === 0) {
      return [] // Không có cuộc trò chuyện nào
    }

    // Lấy danh sách conversationID và lastMessageID
    const conversationIDs = result.Items.map(
      (item) => item.conversationID
    ).filter((id) => id)

    const lastMessageIDs = result.Items.map(
      (item) => item.lastMessageID
    ).filter((id) => id)

    // Truy vấn tất cả conversationName từ bảng conversations
    // const conversationNames = await Promise.all(
    //   conversationIDs.map((id) => conversationModel.findConversationByID(id))
    // )

    let conversationMap = {}
    if (conversationIDs.length > 0) {
      const conversationData = await dynamoClient
        .batchGet({
          RequestItems: {
            [CONVERSATION_TABLE_NAME]: {
              Keys: conversationIDs.map((id) => ({ conversationID: id }))
            }
          }
        })
        .promise()

      // Chuyển thành Map để truy xuất nhanh
      conversationMap = (
        conversationData.Responses[CONVERSATION_TABLE_NAME] || []
      ).reduce((acc, convo) => {
        acc[convo.conversationID] = convo.name
        return acc
      }, {})
    }

    // Truy vấn tất cả tin nhắn
    // const lastMessages = await Promise.all(
    //   lastMessageIDs.map((id) => messageModel.findMessageByID(id))
    // )

    let messageMap = {}
    if (lastMessageIDs.length > 0) {
      const messageData = await dynamoClient
        .batchGet({
          RequestItems: {
            [messageModel.MESSAGE_TABLE_NAME]: {
              Keys: lastMessageIDs.map((id) => ({ messageID: id }))
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
    // const conversations = result.Items.map((item, index) => ({
    //   conversation: item,
    //   conversationName: conversationNames[index]?.name || 'Unknown',
    //   lastMessage: lastMessages[index] || null
    // }))
    const conversations = result.Items.map((item) => ({
      conversation: item,
      conversationName: conversationMap[item.conversationID] || 'Unknown',
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
export const conversationModel = {
  CONVERSATION_TABLE_NAME,
  haveTheyChatted,
  createNewConversation,
  addUserToConversation,
  updateLastMessage,
  findConversationByID,
  getConversations,
  getConversationByName
}
