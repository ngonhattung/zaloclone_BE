import Joi from 'joi'
import dynamoClient from '~/config/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

const GROUP_TABLE_NAME = 'groups'
const GROUP_MEMBER_TABLE_NAME = 'groupMembers'

const create = async (groupName, groupAvatar) => {
  try {
    const groupID = uuidv4()

    const info = {
      groupID,
      groupName,
      groupAvatar,
      createdAt: Date.now(),
      updatedAt: null
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

const addMembers = async (userID, groupID, members) => {
  try {
    const params = {
      RequestItems: {
        [GROUP_MEMBER_TABLE_NAME]: members.map((member) => {
          return {
            PutRequest: {
              Item: {
                groupID,
                memberID: member,
                role: member === userID ? 'admin' : 'member',
                createdAt: Date.now(),
                updatedAt: null
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
export const groupModel = {
  create,
  addMembers
}
