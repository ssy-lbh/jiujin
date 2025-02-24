// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const categoryCollection = db.collection('category')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  // 获取商品分类信息
  app.router('getCategory', async (ctx, next) => {
    try{
      ctx.body = await categoryCollection.where({
        is_deleted: false
      })
      .field({
        _id: true,
        name: true
      })
      .get()
      ctx.body.errno = 0
    }catch(e){
      ctx.body = {
        errno: -1
      }
    }
  })
  return app.serve()
}