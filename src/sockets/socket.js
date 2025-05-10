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
  // Lấy socketId của người nhận
  return userSocketMap[receiverId] || []
}

const getUserSocketId = (userId) => {
  // Lấy socketId của người dùng
  return userSocketMap[userId] || []
}

io.on('connection', (socket) => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId

  if (userId && userId !== 'undefined') {
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = []
    }

    // Thêm socket.id nếu chưa tồn tại
    if (!userSocketMap[userId].includes(socket.id)) {
      userSocketMap[userId].push(socket.id)
    }
  }

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  console.log(userSocketMap)

  socket.on('join', (conversationId) => {
    socket.join(conversationId)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)

    // Tìm userId chứa socket.id này
    for (const [uid, sockets] of Object.entries(userSocketMap)) {
      userSocketMap[uid] = sockets.filter((id) => id !== socket.id)

      // Nếu không còn socket nào thì xóa luôn userId
      if (userSocketMap[uid].length === 0) {
        delete userSocketMap[uid]
      }
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap))
  })
})

export { app, io, getReceiverSocketId, getUserSocketId, server }
