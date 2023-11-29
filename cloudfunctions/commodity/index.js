// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()
const _ = db.command

const commodityCollection = db.collection('commodity')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  // 上传商品详细信息
  app.router('createCommodity', async (ctx, next) => {
    const { rid, cid, content, price, quality, img_urls, sex } = event.params
    // 创建事务
    const transaction = await db.startTransaction()
    try {
      res = await cloud.openapi.security.msgSecCheck({
        content: JSON.stringify(event.params)
      })
      await transaction
        .collection("commodity")
        .add({
          data: {
            rid,
            cid,
            content,
            price,
            quality,
            img_urls,
            sex,
            sell_id: wxContext.OPENID,
            status: 0,
            create_time: db.serverDate(),
            update_time: db.serverDate(),
            is_deleted: false,
          }
        })

      await transaction
        .collection("user")
        .doc(wxContext.OPENID)
        .update({
          data: {
            total_release: _.inc(1),
            update_time: db.serverDate(),
          }
        })
      transaction.commit()
      ctx.body = {
        errno: 0
      }
    } catch (e) {
      transaction.rollback()
      ctx.body = {
        errno: -1
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 获取商品列表
  app.router('getCommodityList', async (ctx, next) => {
    const { rid, cid, keyword, sell_id, buyer_id, sex, status, start, count } = event.params
    const _ = db.command
    let w = {}
    w["rid"] = rid
    if (cid) {
      w["cid"] = cid
    }
    if (keyword && keyword.trim() != '') {
      w = {
        title: new db.RegExp({
          regexp: keyword,
          options: 'i'
        }),
      }
    }
    //如果卖方不是自己的话，需要过滤删除
    if (!sell_id || sell_id != wxContext.OPENID) {
      w["is_deleted"] = false
    }
    if (sell_id) {
      w["sell_id"] = sell_id
    }
    if (buyer_id) {
      w["buyer_id"] = buyer_id
    }
    if (sell_id != wxContext.OPENID && buyer_id != wxContext.OPENID) {
      w["sex"] = _.eq(0).or(_.eq(sex))
    }
    if (status) {
      w["status"] = status
    }
    try {
      ctx.body = await commodityCollection.where(w)
        .orderBy('update_time', 'desc')
        .skip(start)
        .limit(count)
        .get()
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })


  // 更新商品状态
  app.router('updateCommodityStatus', async (ctx, next) => {
    const { _id, status } = event.params
    if (status != 0 && status != 1 && status != 2) {
      ctx.body = {
        error: '不合法的状态',
        errno: -2,
      }
    }
    else {
      try {
        ctx.body = await commodityCollection.where({
          sell_id: wxContext.OPENID,
          _id: _id,
          is_deleted: false
        }).field(
          {
            status: true,
          }
        ).get()
        const before_status = ctx.body.data.status;
        if (!status) {
          if ((before_status == 1 && status == 2) || (before_status == 2 && status != 2)) {
            ctx.body = {
              error: "无效的状态切换",
              errno: -1,
            }
          } else {
            ctx.body = await commodityCollection.where({
              sell_id: wxContext.OPENID,
              _id: _id,
              is_deleted: false
            }).update({
              data: {
                status,
                update_time: db.serverDate(),
              }
            })
            ctx.body.errno = 0
          }
        }
        else {
          ctx.body = {
            error: "unknown status",
            errno: -1,
          }

        }
      } catch (e) {
        ctx.body = {
          error: e ?? 'unknown',
          errno: -1,
        }
        if (e.errCode.toString() === '87014') {
          ctx.body = {
            errno: 87014
          }
        }
      }
    }
  })

  // 更新商品
  app.router('updateCommodity', async (ctx, next) => {
    const { rid, cid, content, price, quality, img_urls, sex } = event.params
    try {
      res = await cloud.openapi.security.msgSecCheck({
        content: JSON.stringify(event.params)
      })
      ctx.body = await commodityCollection.where({
        sell_id: wxContext.OPENID,
        _id: _id,
        is_deleted: false
      }).update({
        data: {
          rid,
          cid,
          content,
          price,
          quality,
          img_urls,
          sex,
          update_time: db.serverDate(),
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1,
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 擦亮商品
  app.router('polishCommodity', async (ctx, next) => {
    const { _id} = event.params
    try {
      ctx.body = await commodityCollection.where({
        sell_id: wxContext.OPENID,
        _id: _id,
        is_deleted: false
      }).update({
        data: {
          update_time: db.serverDate(),
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1,
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 图片安全校验
  app.router('imgSecCheck', async (ctx, next) => {
    params = event.params
    buffer = params.buffer
    suffix = params.suffix.substring(1).toLowerCase()
    try {
      res = await cloud.openapi.security.imgSecCheck({
        media: {
          contentType: 'image/' + suffix,
          value: buffer
        }
      })

      ctx.body = {
        errno: 0
      }
    } catch (e) {
      ctx.body = {
        errno: -1
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 删除商品
  app.router('deleteCommodity', async (ctx, next) => {
    const { _id } = event.params
    // 创建事务
    const transaction = await db.startTransaction()
    try {
      await transaction
        .collection("commodity")
        .where({
          openid: wxContext.OPENID,
          _id: _id,
          is_deleted: false
        }).update({
          data: {
            is_deleted: true
          }
        })

      await transaction
        .collection("user")
        .doc(wxContext.OPENID)
        .update({
          data: {
            total_release: _.inc(-1),
            update_time: db.serverDate(),
          }
        })
      transaction.commit()
      ctx.body = {
        errno: 0
      }
    } catch (e) {
      transaction.rollback()
      ctx.body = {
        errno: -1
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })


  // 通过_id删除商品(soft-del)，涉及多张表，使用事务
  // !!!!! 在事务中仅能进行单记录操作，也就是不能使用 where、aggregate 接口 ???  !!!
  // 不能用事务怎么保证ACID?
  // 先查到所有相关主键。。。再传过来一个个删除。。。???
  // 有无更好的解决方法？？？
  app.router('delCommodity', async (ctx, next) => {
    const { cid, tids, qids, aids, fileIDs } = event.params
    // 创建事务
    const transaction = await db.startTransaction()

    try {

      let res = {}

      // 判断该商品是否有相关联的交易，若还有状态处于进行中的交易，则禁止删除
      for (let i = 0; i < tids.length; i++) {
        res = await transaction
          .collection("transaction")
          .doc(tids[i])
          .get()
        console.log(res)
        const transactionDetail = res.data
        if (transactionDetail.status == 0) {
          ctx.body = {
            errno: -2
          }
          return
        }
      }
      // 删除相关提问
      for (let i = 0; i < qids.length; i++) {
        res = await transaction
          .collection("commodity_question")
          .doc(qids[i])
          .update({
            data: {
              is_deleted: true
            }
          })
        console.log(res)
      }

      // 删除相关回答
      for (let i = 0; i < aids.length; i++) {
        res = await transaction
          .collection("commodity_answer")
          .doc(aids[i])
          .update({
            data: {
              is_deleted: true
            }
          })
        console.log(res)
      }

      // 删除商品信息
      res = await transaction
        .collection("commodity")
        .doc(cid)
        .update({
          data: {
            is_deleted: true
          }
        })

      // 删除相关图片
      // 不在事务内，但是最后一步执行，若删除图片出错，事务仍然会回滚
      res = await cloud.deleteFile({
        fileList: fileIDs,
      })
      transaction.commit()
      ctx.body = {
        errno: 0
      }

    } catch (e) {
      transaction.rollback()
      ctx.body = {
        errno: -1
      }
    }
  })


  return app.serve()
}