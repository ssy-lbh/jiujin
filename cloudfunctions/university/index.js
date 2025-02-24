// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const universityCollection = db.collection('university')

const MAX_LIMIT = 50

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  // 获取大学信息，可能要多次取，最多100条一次
  app.router('getUniversityInfo', async (ctx, next) => {
    try {
      const countResult = await universityCollection.where({
        is_deleted: false
      }).count()
      const total = countResult.total
      const batchTimes = Math.ceil(total / MAX_LIMIT)
      let res = {}
      ctx.body = {
        data: []
      }
      for (let i = 0; i < batchTimes; i++) {
        res = await universityCollection.where({
          is_deleted: false
        })
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .field({
            name: true,
            province: true,
            uid: true
          })
          .get()
        ctx.body.data = ctx.body.data.concat(res.data)
      }
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e,
        errno: -1
      }
    }
  })
  return app.serve()
}