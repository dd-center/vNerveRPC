const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const protoPath = 'vNerveTransmitter/vNerve/vdb/vdb.proto'
const got = require('got')

const VtuberType = {
    UNKNOWN_VTUBER_TYPE: 0,
    VTUBER: 1,
    GROUP: 2,
    FAN: 3
}
const AccountType = {
    UNKNOWN_ACCOUNT_TYPE: 0,
    OFFICIAL: 1,
    RELAY: 2
}
const AccountPlatform = {
    UNKNOWN_PLATFORM: 0,
    BILIBILI: 1,
    TWITTER: 2,
    YOUTUBE: 3,
    USERLOCAL: 4,
    PEING: 5,
    MARSHMALLOW: 6,
    PIXIV: 7,
    WEIBO: 8,
    BOOTH: 9,
    AFDIAN: 10,
    WEB: 11,
    EMAIL: 12,
    INSTAGRAM: 13,
    POPIASK: 14,
    AMAZON_CO_JP: 15,
    TWITCH: 16,
    NICONICO: 17,
    FACEBOOK: 18,
    TEESPRING: 19,
    PATREON: 20,
    JVCMUSIC: 21,
    CI_EN: 22,
    GITHUB: 23,
    LINE: 24,
    TIKTOK: 25,
    FANTIA: 26,
    SHOWROOM: 27,
    TELEGRAM: 28,
}
const vtuberTypeMapping = {
    'vtuber': VtuberType.VTUBER,
    'group': VtuberType.GROUP,
    'fan': VtuberType.fan
}
const accountTypeMapping = {
    'official': AccountType.OFFICIAL,
    'relay': AccountType.RELAY,
}
const accountPlatformMapping = {
    'bilibili': AccountPlatform.BILIBILI,
    'twitter': AccountPlatform.TWITTER,
    'youtube': AccountPlatform.YOUTUBE,
    'userlocal': AccountPlatform.USERLOCAL,
    'peing': AccountPlatform.PEING,
    'marshmallow': AccountPlatform.MARSHMALLOW,
    'pixiv': AccountPlatform.PIXIV,
    'weibo': AccountPlatform.WEIBO,
    'booth': AccountPlatform.BOOTH,
    'afdian': AccountPlatform.AFDIAN,
    'web': AccountPlatform.WEB,
    'email': AccountPlatform.EMAIL,
    'instagram': AccountPlatform.INSTAGRAM,
    'popiask': AccountPlatform.POPIASK,
    'amazon.co.jp': AccountPlatform.AMAZON_CO_JP,
    'twitch': AccountPlatform.TWITCH,
    'niconico': AccountPlatform.NICONICO,
    'facebook': AccountPlatform.FACEBOOK,
    'teespring': AccountPlatform.TEESPRING,
    'patreon': AccountPlatform.PATREON,
    'jvcmusic': AccountPlatform.JVCMUSIC,
    'ci-en': AccountPlatform.CI_EN,
    'github': AccountPlatform.GITHUB,
    'line': AccountPlatform.LINE,
    'tiktok': AccountPlatform.TIKTOK,
    'fantia': AccountPlatform.FANTIA,
    'showroom': AccountPlatform.SHOWROOM,
    'telegram': AccountPlatform.TELEGRAM
}

const getListFromVdb = (type, vdb) => vdb.vtbs.filter(vtb => vtb.type == type).map(vtb => ({
    uuid: vtb.uuid,
    type: vtuberTypeMapping[vtb.type],
    bot: vtb.bot,
    accounts: vtb.accounts.map(account => {
        const account_type = accountTypeMapping[account.type]
        const account_platform = accountPlatformMapping[account.platform]
        return {
            id: account.id,
            account_type: account_type ? account_type : AccountType.UNKNOWN_ACCOUNT_TYPE,
            account_platform: account_platform ? account_platform : AccountPlatform.UNKNOWN_PLATFORM
        }
    }),
    name: vtb.name[vtb.name.default],
    name_extra: vtb.name.extra,
    name_translation: ((names) => {
        const { extra, default: { }, ...nameTranslation } = names
        return nameTranslation
    })(vtb.name),
    group_uuid: vtb.group,
    model_2d: vtb['2d'],
    model_3d: vtb['3d'],
    model_2d_artist_uuid: vtb['2dArtist'],
    model_3d_artist_uuid: vtb['3dArtist']
}))

const service = grpc.loadPackageDefinition(protoLoader.loadSync(protoPath,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })).vNerve.vdb.VtuberDatabase.service

const vdbBuffer = {
    linkSyntaxCollection: Buffer.from(''),
    vtuberCollection: Buffer.from(''),
    groupCollection: Buffer.from(''),
    fansCollection: Buffer.from(''),
}

const updateVdb = vdbBuffer => {
    got('https://vdb.vtbs.moe/json/list.json', { responseType: 'json' }).then(({ body }) => {
        vdbBuffer.linkSyntaxCollection = service.GetLinkSyntaxs.responseSerialize({
            link_syntaxs: body.meta.linkSyntax
        })
        vdbBuffer.vtuberCollection = service.GetAllVtubers.responseSerialize({
            vtubers: getListFromVdb('vtuber', body)
        })
        vdbBuffer.groupCollection = service.GetAllGroups.responseSerialize({
            groups: getListFromVdb('group', body)
        })
        vdbBuffer.fansCollection = service.GetAllFans.responseSerialize({
            fans: getListFromVdb('fan', body)
        })
    }).catch(e => {
        console.log(e)
    })
}

const init = ((vdbBuffer) => {
    updateVdb(vdbBuffer)
    setInterval(updateVdb, 60 * 60 * 1000, vdbBuffer)
})(vdbBuffer)

const getLinkSyntaxs = {
    name: service.GetLinkSyntaxs.path,
    handler: (call, callback) => {
        console.info(`call : ${service.GetLinkSyntaxs.path}`)
        callback(null, vdbBuffer.linkSyntaxCollection)
    },
    serialize: res => res,
    deserialize: service.GetLinkSyntaxs.requestDeserialize,
    type: 'unary'
}

const getAllVtubers = {
    name: service.GetAllVtubers.path,
    handler: (call, callback) => {
        console.info(`call : ${service.GetAllVtubers.path}`)
        callback(null, vdbBuffer.vtuberCollection)
    },
    serialize: res => res,
    deserialize: service.GetAllVtubers.requestDeserialize,
    type: 'unary'
}

const getAllGroups = {
    name: service.GetAllGroups.path,
    handler: (call, callback) => {
        console.info(`call : ${service.GetAllGroups.path}`)
        callback(null, vdbBuffer.groupCollection)
    },
    serialize: res => res,
    deserialize: service.GetAllGroups.requestDeserialize,
    type: 'unary'
}

const getAllFans = {
    name: service.GetAllFans.path,
    handler: (call, callback) => {
        console.info(`call : ${service.GetAllFans.path}`)
        callback(null, vdbBuffer.fansCollection)
    },
    serialize: res => res,
    deserialize: service.GetAllFans.requestDeserialize,
    type: 'unary'
}

module.exports = [
    getLinkSyntaxs,
    getAllVtubers,
    getAllGroups,
    getAllFans
]
