import dynamoClient from '~/config/dynamodb'

import { userModel } from '~/models/userModel'

const GROUP_TABLE_NAME = 'groups'
const GROUP_MEMBER_TABLE_NAME = 'groupMembers'

const create = async (conversationID, groupName, groupAvatar) => {
  try {
    const groupID = conversationID

    const info = {
      groupID,
      groupName,
      groupAvatar,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      destroy: false
    }

    const params = {
      TableName: GROUP_TABLE_NAME,
      Item: info
    }

    await dynamoClient.put(params).promise()

    return info
  } catch (error) {
    throw new Error(error)
  }
}

const createGroupMembers = async (userID, groupID, members) => {
  try {
    const params = {
      RequestItems: {
        [GROUP_MEMBER_TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                groupID,
                userID: userID,
                role: 'admin',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                destroy: false
              }
            }
          },
          ...members.map((member) => ({
            PutRequest: {
              Item: {
                groupID,
                userID: member,
                role: 'member',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                destroy: false
              }
            }
          }))
        ]
      }
    }

    await dynamoClient.batchWrite(params).promise()
    return true
  } catch (error) {
    throw new Error(error)
  }
}

const addMembers = async (groupID, members) => {
  try {
    const params = {
      RequestItems: {
        [GROUP_MEMBER_TABLE_NAME]: members.map((member) => {
          return {
            PutRequest: {
              Item: {
                groupID,
                userID: member,
                role: 'member',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                destroy: false
              }
            }
          }
        })
      }
    }

    await dynamoClient.batchWrite(params).promise()
    return true
  } catch (error) {
    throw new Error(error)
  }
}

const findGroupByID = async (groupID) => {
  try {
    const params = {
      TableName: GROUP_TABLE_NAME,
      Key: {
        groupID
      }
    }

    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}

const findGroupMembersByID = async (groupID) => {
  try {
    const params = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      KeyConditionExpression: 'groupID = :groupID',
      ExpressionAttributeValues: {
        ':groupID': groupID
      }
    }

    const result = await dynamoClient.query(params).promise()
    return result.Items
  } catch (error) {
    throw new Error(error)
  }
}

const leaveGroup = async (userID, groupID) => {
  try {
    const params = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      Key: {
        groupID,
        userID: userID
      }
    }
    await dynamoClient.delete(params).promise()
    return true
  } catch (error) {
    throw new Error(error)
  }
}

const deleteGroup = async (groupID) => {
  try {
    const params = {
      TableName: GROUP_TABLE_NAME,
      Key: {
        groupID
      }
    }

    await dynamoClient.delete(params).promise()
    return true
  } catch (error) {
    throw new Error(error)
  }
}

const grantAdmin = async (memberID, groupID) => {
  try {
    const promoteParams = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      Key: { groupID, userID: memberID },
      UpdateExpression: 'set #r = :role',
      ExpressionAttributeNames: {
        '#r': 'role'
      },
      ExpressionAttributeValues: {
        ':role': 'admin'
      }
    }

    await dynamoClient.update(promoteParams).promise()
    return true
  } catch (error) {
    throw new Error(`grantAdmin error: ${error.message}`)
  }
}

const revokeAdmin = async (userID, groupID) => {
  try {
    const revokeParams = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      Key: { groupID, userID: userID },
      UpdateExpression: 'set #r = :role',
      ExpressionAttributeNames: {
        '#r': 'role'
      },
      ExpressionAttributeValues: {
        ':role': 'member'
      }
    }

    await dynamoClient.update(revokeParams).promise()
    return true
  } catch (error) {
    throw new Error(`revokeAdmin error: ${error.message}`)
  }
}

const getMyGroups = async (userID) => {
  try {
    const params = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      IndexName: 'userID-index',
      KeyConditionExpression: 'userID = :userID',
      ExpressionAttributeValues: {
        ':userID': userID
      }
    }

    const groupMembers = await dynamoClient.query(params).promise()
    const groupIDs = groupMembers.Items.map((item) => item.groupID)

    if (!groupIDs.length) return []

    const groupParams = {
      RequestItems: {
        [GROUP_TABLE_NAME]: {
          Keys: groupIDs.map((groupID) => ({ groupID }))
        }
      }
    }

    const groups = await dynamoClient.batchGet(groupParams).promise()
    const groupDetails = groups.Responses[GROUP_TABLE_NAME].filter(
      (group) => !group.destroy
    ).map((group) => ({
      groupID: group.groupID,
      groupName: group.groupName,
      groupAvatar: group.groupAvatar,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }))

    return groupDetails
  } catch (error) {
    throw error
  }
}

const getAllGroups = async () => {
  try {
    const params = {
      TableName: GROUP_TABLE_NAME,
      FilterExpression: 'destroy = :destroy',
      ExpressionAttributeValues: {
        ':destroy': false
      }
    }

    const result = await dynamoClient.scan(params).promise()
    return result.Items
  } catch (error) {
    throw new Error(error)
  }
}

const getGroupInfo = async (groupID) => {
  try {
    const params = {
      TableName: GROUP_TABLE_NAME,
      Key: {
        groupID
      }
    }

    const result = await dynamoClient.get(params).promise()
    return result.Item
  } catch (error) {
    throw new Error(error)
  }
}

const getMembersInGroup = async (groupID) => {
  try {
    const params = {
      TableName: GROUP_MEMBER_TABLE_NAME,
      KeyConditionExpression: 'groupID = :groupID',
      ExpressionAttributeValues: {
        ':groupID': groupID
      }
    }

    const groups = await dynamoClient.query(params).promise()
    const groupItems = groups.Items || []

    if (!groupItems.length) return []

    const userIDs = groupItems.map((item) => item.userID)

    const userParams = {
      RequestItems: {
        [userModel.USER_TABLE_NAME]: {
          Keys: userIDs.map((userID) => ({ userID }))
        }
      }
    }

    const users = await dynamoClient.batchGet(userParams).promise()
    const userList = users.Responses?.[userModel.USER_TABLE_NAME] || []

    const userMap = new Map(
      userList.map((user) => [
        user.userID,
        {
          userID: user.userID,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      ])
    )

    const members = groupItems
      .filter((item) => !item.destroy)
      .map((item) => ({
        groupID: item.groupID,
        role: item.role,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userInfo: userMap.get(item.userID) || null
      }))

    return members
  } catch (error) {
    throw error
  }
}
export const groupModel = {
  create,
  createGroupMembers,
  addMembers,
  findGroupByID,
  findGroupMembersByID,
  leaveGroup,
  deleteGroup,
  grantAdmin,
  revokeAdmin,
  getMyGroups,
  getAllGroups,
  getGroupInfo,
  getMembersInGroup
}
