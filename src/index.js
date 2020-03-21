const grpc = require('grpc')
const vdbServices = require('./services/vtuber_database_service')
const bilibiliInfoServices = require('./services/bilibili_info_service')
const port = '0.0.0.0:50052'
const server = new grpc.Server()

const services = vdbServices.concat(bilibiliInfoServices)
services.forEach(service=>{
    server.register(service.name,service.handler,service.serialize,service.deserialize,service.type)
})

server.bind(port,grpc.ServerCredentials.createInsecure())
server.start()
console.info('*************************************')
console.info(`server start at ${port}`)
console.info(`services : `)
services.forEach(service=>{
    console.info(service.name)
})
console.info('*************************************')