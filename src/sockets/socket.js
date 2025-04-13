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
  return userSocketMap[receiverId]
}

const getUserSocketId = (userId) => {
  // Lấy socketId của người dùng
  return userSocketMap[userId]
}

io.on('connection', (socket) => {
  console.log('A user connect', socket.id)
  const userId = socket.handshake.query.userId
  if (userId !== 'undefined') userSocketMap[userId] = socket.id

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  console.log(Object.keys(userSocketMap))

  socket.on('join', (conversationId) => {
    // Tham gia vào một conversation (chat room)
    socket.join(conversationId)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnect', socket.id)
    delete userSocketMap[userId]
    io.emit('getOnlineUsers', Object.keys(userSocketMap))
  })
})

export { app, io, getReceiverSocketId, getUserSocketId, server }
