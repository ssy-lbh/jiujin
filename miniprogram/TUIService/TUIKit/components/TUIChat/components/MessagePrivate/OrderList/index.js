import constant from '../../../../../utils/constant';

const app = getApp();

//TODO 发送订单信息
/*
const orderList = [
  {
    orderNum: 1,
    time: '2021-7-20 20:45',
    title: '即时通信 IM 首购活动',
    description: '单用户限购1件',
    imageUrl: 'https://sdk-web-1252463788.cos.ap-hongkong.myqcloud.com/component/TUIKit/assets/im.jpg',
    link: 'https://cloud.tencent.com/act/pro/imnew?from=16262',
    imageWidth: 135,
    imageHeight: 135,
    price: '0.9折起',
  },
  {
    orderNum: 2,
    time: '2021-7-20 22:45',
    title: '即时通信 IM 老客户热销专区',
    description: '购买时长越长越优惠',
    imageUrl: 'https://sdk-web-1252463788.cos.ap-hongkong.myqcloud.com/component/TUIKit/assets/im.jpg',
    link: 'https://cloud.tencent.com/act/pro/imnew?from=16262',
    imageWidth: 135,
    imageHeight: 135,
    price: '7.2折起',
  },
];
*/

// eslint-disable-next-line no-undef
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    display: {
      type: Boolean,
      value: '',
      observer(newVal) {
        this.setData({
          displayTag: newVal,
        });
      },
    },
    conversation: {
      type: Object,
      value: {},
      observer(newVal) {
        this.setData({
          conversation: newVal,
        });
      },
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    displayTag: true,
    words: '',
    orderMatch: [],
  },

  lifetimes: {
    attached() {
    },
    ready() {
      const commodity = app.globalData.config.commodity;
      if (!commodity) return;
      var order = [];
      order.push({
        orderNum: commodity._id,
        time: new Date(commodity.create_time).toLocaleDateString(),
        title: commodity.content,
        description: '',
        imageUrl: commodity.img_urls[0],
        link: `/pages/commodity_detail/index?id=${commodity._id}}`,
        imageWidth: 135,
        imageHeight: 135,
        price: '￥' + commodity.price,
      });
      this.setData({
        orderMatch: order
      });
    },
    detached() {
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    handleClose() {
      this.triggerEvent('close', {
        key: '1',
      });
    },
    wordsInput(e) {
      this.data.orderMatch = [],
      orderList.forEach((item) => {
        if (item.title.indexOf(e.detail.value) > -1 || item.orderNum === ~~e.detail.value) {
          this.data.orderMatch.push(item);
        }
      });
      this.setData({
        words: e.detail.value,
        orderMatch: this.data.orderMatch,
      });
    },
    sendMessage(e) {
      const { BUSINESS_ID_TEXT, FEAT_NATIVE_CODE } = constant;
      const { order } = e.currentTarget.dataset;
      this.triggerEvent('sendCustomMessage', { // 传递给父组件，在父组件处调用SDK的接口，来进行自定消息的发送
        payload: {
          data: JSON.stringify({
            businessID: BUSINESS_ID_TEXT.ORDER,
            version: FEAT_NATIVE_CODE.NATIVE_VERSION,
            title: order.title,
            imageUrl: order.imageUrl,
            imageWidth: order.imageWidth,
            imageHeight: order.imageHeight,
            link: order.link,
            price: order.price,
            description: order.description,
          }), // data字段用于标识该消息类型
          description: order.title, // 获取自定义消息的具体描述
          extension: order.title, // 自定义消息的具体内容
        },
      });
    },
  },
});
