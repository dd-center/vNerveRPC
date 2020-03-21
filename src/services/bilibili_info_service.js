const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const protoPath = 'vNerveTransmitter/vNerve/bilibili/bilibili_info.proto'
const got = require('got')
const io = require('socket.io-client')
const socket = io('https://api.vtbs.moe')

const service = grpc.loadPackageDefinition(protoLoader.loadSync(protoPath,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })).vNerve.bilibili.Bilibili.service

const bilibiliInfoBuffer = {
    bilibiliInfos: Buffer.from(''),
    bilibiliInfosStatic: Buffer.from(''),
    bilibiliInfosMap: new Map(),
    bilibiliInfosStaticMap: new Map(),
}
const bilibiliInfos = new Map()
const bilibiliInfosStatic = new Map()

const updateBilibiliInfoBuffer = (bilibiliInfoBuffer) => {
    bilibiliInfoBuffer.bilibiliInfos = service.GetAllBilibiliInfos.responseSerialize({
        bilibili_infos: Array.from(bilibiliInfos.values())
    })
    bilibiliInfoBuffer.bilibiliInfosStatic = service.GetAllBilibiliInfos.responseSerialize({
        bilibili_infos: Array.from(bilibiliInfosStatic.values())
    })
    Array.from(bilibiliInfos.values()).forEach(bilibiliInfo => {
        bilibiliInfoBuffer.bilibiliInfosMap.set(bilibiliInfo.uid, service.GetBilibiliInfoByUid.responseSerialize(bilibiliInfo))
    })
    Array.from(bilibiliInfosStatic.values()).forEach(bilibiliInfo => {
        bilibiliInfoBuffer.bilibiliInfosStaticMap.set(bilibiliInfo.uid, service.GetBilibiliInfoByUid.responseSerialize(bilibiliInfo))
    })

}
const bilibiliInfoMapping = (bilibiliInfo, static_only) => {
    return static_only ?
        {
            uid: bilibiliInfo.mid,
            uuid: bilibiliInfo.uuid,
            uname: bilibiliInfo.uname,
            room_id: bilibiliInfo.roomid,
            description: bilibiliInfo.sign,
            room_notice: bilibiliInfo.notice,
            avatar_url: bilibiliInfo.face,
            banner_image_url: bilibiliInfo.topPhoto
        } :
        {
            uid: bilibiliInfo.mid,
            uuid: bilibiliInfo.uuid,
            uname: bilibiliInfo.uname,
            room_id: bilibiliInfo.roomid,
            description: bilibiliInfo.sign,
            room_notice: bilibiliInfo.notice,
            avatar_url: bilibiliInfo.face,
            banner_image_url: bilibiliInfo.topPhoto,
            follower: bilibiliInfo.follower,
            follower_daily_increment: bilibiliInfo.rise,
            room_title: bilibiliInfo.title,
            live_status: bilibiliInfo.liveStatus,
            popularity: bilibiliInfo.online,
            rank_area: bilibiliInfo.areaRank,
            video_count: bilibiliInfo.video,
            video_total_views: bilibiliInfo.archiveView,
            guard_count: bilibiliInfo.guardNum,
            guard_level1: bilibiliInfo.guardType[2],
            guard_level2: bilibiliInfo.guardType[1],
            guard_level3: bilibiliInfo.guardType[0],
        }
}
const fixBilibiliInfos = (bilibiliInfos, bilibiliInfosStatic) => {
    got('https://api.vtbs.moe/v1/info', { responseType: 'json' }).then(({ body }) => {
        body.forEach(bilibiliInfo => {
            bilibiliInfos.set(bilibiliInfo.mid, bilibiliInfoMapping(bilibiliInfo, false))
            bilibiliInfosStatic.set(bilibiliInfo.mid, bilibiliInfoMapping(bilibiliInfo, true))
        })
        updateBilibiliInfoBuffer(bilibiliInfoBuffer)
    }).catch(e => {
        console.log(e)
    })
}

const init = ((bilibiliInfos, bilibiliInfosStatic) => {
    socket.on('info', infos => {
        infos.forEach(bilibiliInfo => {
            if(bilibiliInfos.has(bilibiliInfo.mid)){
                bilibiliInfo.topPhoto = bilibiliInfos.get(bilibiliInfo.mid).banner_image_url
                bilibiliInfo.areaRank = bilibiliInfos.get(bilibiliInfo.mid).rank_area
                bilibiliInfo.video = bilibiliInfos.get(bilibiliInfo.mid).video_count
                bilibiliInfo.video = bilibiliInfos.get(bilibiliInfo.mid).video_count
                bilibiliInfo.notice = bilibiliInfos.get(bilibiliInfo.mid).room_notice
            }
            bilibiliInfos.set(bilibiliInfo.mid, bilibiliInfoMapping(bilibiliInfo, false))
            bilibiliInfosStatic.set(bilibiliInfo.mid, bilibiliInfoMapping(bilibiliInfo, true))
        })
        updateBilibiliInfoBuffer(bilibiliInfoBuffer)
    })
    fixBilibiliInfos(bilibiliInfos, bilibiliInfosStatic)
    setInterval(fixBilibiliInfos, 600000, bilibiliInfos, bilibiliInfosStatic)
})(bilibiliInfos, bilibiliInfosStatic)

const getAllBilibiliInfos = {
    name: service.GetAllBilibiliInfos.path,
    handler: (call, callback) => {
        const { static_only } = call.request
        console.info(`call : ${service.GetAllBilibiliInfos.path} request : ${JSON.stringify(call.request)}`) 
        callback(null, static_only ? bilibiliInfoBuffer.bilibiliInfosStatic : bilibiliInfoBuffer.bilibiliInfos)
    },
    serialize: res => res,
    deserialize: service.GetAllBilibiliInfos.requestDeserialize,
    type: 'unary'
}
const getBilibiliInfoByUid = {
    name: service.GetBilibiliInfoByUid.path,
    handler: (call, callback) => {
        const { uid, static_only } = call.request
        console.info(`call : ${service.GetBilibiliInfoByUid.path} request : ${JSON.stringify(call.request)}`) 
        callback(null, bilibiliInfoBuffer.bilibiliInfosMap.has(uid) ? static_only ? bilibiliInfoBuffer.bilibiliInfosStaticMap.get(uid) : bilibiliInfoBuffer.bilibiliInfosMap.get(uid) : Buffer.from(''))
    },
    serialize: res => res,
    deserialize: service.GetBilibiliInfoByUid.requestDeserialize,
    type: 'unary'
}
module.exports = [
    getAllBilibiliInfos,
    getBilibiliInfoByUid
]