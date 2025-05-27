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

  return Object.values(sockets).filter(Boolean)
}

const getUserSocketId = (userId) => {
  const sockets = userSocketMap[userId]
  if (!sockets) return []

  return Object.values(sockets).filter(Boolean)
}

io.on('connection', (socket) => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId
  const deviceType = socket.handshake.query.deviceType // 'mobile', 'web', 'tablet', v.v.

  if (!userId || !deviceType) {
    socket.disconnect()
    return
  }

  // Nếu đã có thiết bị cùng loại đăng nhập => từ chối (áp dụng cả mobile và web)
  if (
    userSocketMap[userId] &&
    ((deviceType === 'mobile' && userSocketMap[userId].mobile) ||
      (deviceType === 'web' && userSocketMap[userId].web))
  ) {
    console.log(`User ${userId} đã đăng nhập trên thiết bị ${deviceType} khác`)
    socket.emit(
      'loginDenied',
      `Chỉ được đăng nhập 1 ${deviceType} tại 1 thời điểm`
    )
    console.log(userSocketMap)
    socket.disconnect()
    return
  }

  // Khởi tạo user nếu chưa có
  if (!userSocketMap[userId]) {
    userSocketMap[userId] = {}
  }

  // Xử lý lưu socketId theo loại thiết bị
  userSocketMap[userId][deviceType] = socket.id

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  socket.emit('loginAccepted')
  console.log(userSocketMap)

  socket.on('join', (conversationId) => {
    socket.join(conversationId)
  })

  // User A gọi cho user B
  socket.on('call-user', ({ targetUserId, offer }) => {
    const targetSocketIds = getReceiverSocketId(targetUserId)
    targetSocketIds.forEach((socketId) => {
      io.to(socketId).emit('incoming-call', {
        from: userId,
        offer
      })
    })
  })

  // User B trả lời cuộc gọi
  socket.on('answer-call', ({ targetUserId, answer }) => {
    const targetSocketIds = getReceiverSocketId(targetUserId)
    targetSocketIds.forEach((socketId) => {
      io.to(socketId).emit('call-answered', {
        from: userId,
        answer
      })
    })
  })

  // Trao đổi ICE Candidate
  socket.on('ice-candidate', ({ targetUserId, candidate }) => {
    const targetSocketIds = getReceiverSocketId(targetUserId)
    targetSocketIds.forEach((socketId) => {
      io.to(socketId).emit('ice-candidate', {
        from: userId,
        candidate
      })
    })
  })

  // Khi một trong hai bên kết thúc cuộc gọi
  socket.on('end-call', ({ targetUserId }) => {
    const targetSocketIds = getReceiverSocketId(targetUserId)

    targetSocketIds.forEach((socketId) => {
      io.to(socketId).emit('call-ended', {
        from: userId
      })
    })

    // Có thể log lại hoặc broadcast cho admin/monitor nếu cần
    console.log(`User ${userId} kết thúc cuộc gọi với ${targetUserId}`)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)

    if (userSocketMap[userId]) {
      if (userSocketMap[userId][deviceType] === socket.id) {
        delete userSocketMap[userId][deviceType]
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
