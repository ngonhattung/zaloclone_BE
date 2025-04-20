import express from 'express'
import { corsOptions } from '~/config/cors.js'
import http from 'http'
import socketIo from 'socket.io'

const app = express()

const server = http.createServer(app)

//Tạo một server bọc app của express để làm real time với socket.io
const io = socketIo(server, { cors: { corsOptions } })

const userSocketMap = {} // Lưu trữ thông tin socket của người dùng

const getReceiverSocketId = (receiverId) => {
  const sockets = userSocketMap[receiverId]
  if (!sockets) return []

  let result = []
  if (sockets.mobile) {
    result.push(sockets.mobile)
  }

  for (const device in sockets) {
    if (device !== 'mobile' && Array.isArray(sockets[device])) {
      result = result.concat(sockets[device])
    }
  }

  return result // trả về array các socketId
}

const getUserSocketId = (userId) => {
  const sockets = userSocketMap[userId]
  if (!sockets) return []

  let result = []
  if (sockets.mobile) {
    result.push(sockets.mobile)
  }

  for (const device in sockets) {
    if (device !== 'mobile' && Array.isArray(sockets[device])) {
      result = result.concat(sockets[device])
    }
  }

  return result // trả về array các socketId
}

io.on('connection', (socket) => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId
  const deviceType = socket.handshake.query.deviceType // 'mobile', 'web', 'tablet', v.v.

  if (!userId || !deviceType) {
    socket.disconnect()
    return
  }

  // Nếu đăng nhập bằng mobile nhưng đã có mobile khác -> từ chối
  if (
    deviceType === 'mobile' &&
    userSocketMap[userId] &&
    userSocketMap[userId].mobile
  ) {
    console.log(`User ${userId} đã đăng nhập trên mobile khác`)
    socket.emit(
      'loginDenied',
      'Chỉ được đăng nhập 1 điện thoại tại 1 thời điểm'
    )
    socket.disconnect()
    return
  }

  // Khởi tạo user nếu chưa có
  if (!userSocketMap[userId]) {
    userSocketMap[userId] = {}
  }

  // Xử lý lưu socketId theo loại thiết bị
  if (deviceType === 'mobile') {
    userSocketMap[userId].mobile = socket.id
  } else {
    if (!userSocketMap[userId][deviceType]) {
      userSocketMap[userId][deviceType] = []
    }
    userSocketMap[userId][deviceType].push(socket.id)
  }

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  console.log(userSocketMap)

  socket.on('join', (conversationId) => {
    socket.join(conversationId)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)

    if (userSocketMap[userId]) {
      if (
        deviceType === 'mobile' &&
        userSocketMap[userId].mobile === socket.id
      ) {
        delete userSocketMap[userId].mobile
      } else if (
        userSocketMap[userId][deviceType] &&
        Array.isArray(userSocketMap[userId][deviceType])
      ) {
        userSocketMap[userId][deviceType] = userSocketMap[userId][
          deviceType
        ].filter((id) => id !== socket.id)
        if (userSocketMap[userId][deviceType].length === 0) {
          delete userSocketMap[userId][deviceType]
        }
      }

      // Nếu user không còn socket nào trên bất kỳ device nào thì xóa hẳn
      if (Object.keys(userSocketMap[userId]).length === 0) {
        delete userSocketMap[userId]
      }
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap))
  })
})

export { app, io, getReceiverSocketId, getUserSocketId, server }
