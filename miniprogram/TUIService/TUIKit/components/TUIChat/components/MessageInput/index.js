import logger from '../../../../utils/logger';
import constant from '../../../../utils/constant';
import { COMMODITY_STATUS_LOCKED, COMMODITY_STATUS_OFF, COMMODITY_STATUS_SELLING, COMMODITY_STATUS_SOLD } from '../../../../../../constants';
import api from '../../../../../../api/api';

var app = getApp();

// eslint-disable-next-line no-undef
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    conversation: {
      type: Object,
      value: {},
      observer(newVal) {
        this.setData({
          conversation: newVal,
        });
        this.initCommodity();
      },
    },
    hasCallKit: {
      type: Boolean,
      value: false,
      observer(hasCallKit) {
        this.setData({
          hasCallKit,
        });
      },
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    conversation: {},
    message: '',
    extensionArea: false,
    sendMessageBtn: false,
    displayFlag: '',
    isAudio: false,
    bottomVal: 0,
    startPoint: 0,
    popupToggle: false,
    isRecording: false,
    canSend: true,
    text: '按住说话',
    title: ' ',
    notShow: false,
    isShow: true,
    commonFunction: [],
    displayServiceEvaluation: false,
    showErrorImageFlag: 0,
    messageList: [],
    isFirstSendTyping: true,
    time: 0,
    focus: false,
    isEmoji: false,
    fileList: [],
    hasCallKit: false,
    textareaHeight: 0,
  },

  lifetimes: {
    attached() {
      // 加载声音录制管理器
      this.recorderManager = wx.getRecorderManager();
      this.recorderManager.onStop((res) => {
        wx.hideLoading();
        if (this.data.canSend) {
          if (res.duration < 1000) {
            wx.showToast({
              title: '录音时间太短',
              icon: 'none',
            });
          } else {
            // res.tempFilePath 存储录音文件的临时路径
            const message = wx.$TUIKit.createAudioMessage({
              to: this.getToAccount(),
              conversationType: this.data.conversation.type,
              payload: {
                file: res,
              },
            });
            this.$sendTIMMessage(message);
          }
        }
        this.setData({
          startPoint: 0,
          popupToggle: false,
          isRecording: false,
          canSend: true,
          title: ' ',
          text: '按住说话',
        });
      });
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    async initCommodity(){
      const { data: { groupAttributes: attrs } } = await wx.$TUIKit.getGroupAttributes({
        groupID: this.data.conversation.groupProfile.groupID,
        keyList: [ "commodityID", "sellID" ]
      });
      const { data: commodity } = await api.getCommodityInfo({ id: attrs.commodityID });
      this.setData({
        commodity,
        isSeller: attrs.sellID == app.globalData.self._id,
      });
      if (this.data.isSeller){
        this.setData({
          commonFunction: [
            { name: '常用语', key: '0' },
            { name: '解锁', key: '4' },
            { name: '售出', key: '5' },
          ]
        });
      } else {
        this.setData({
          commonFunction: [
            { name: '常用语', key: '0' },
          ]
        });
      }
    },
    // 获取消息列表来判断是否发送正在输入状态
    getMessageList(conversation) {
      wx.$TUIKit.getMessageList({
        conversationID: conversation.conversationID,
        nextReqMessageID: this.data.nextReqMessageID,
        count: 15,
      }).then((res) => {
        const { messageList } = res.data;
        this.setData({
          messageList,
        });
      });
    },

    // 打开录音开关
    switchAudio() {
      this.setData({
        isAudio: !this.data.isAudio,
        isEmoji: false,
        text: '按住说话',
        focus: false,
      });
    },

    handleTouchStart() {
      wx.getSetting({
        success: async (res) => {
          const isRecord = res.authSetting['scope.record'];
          // 首次获取权限时, isRecord === undefine， 需使用 this.recorderManager 内置调用权限功能
          // 当 isRecord === false 时，表示首次未授权，不会触发 this.recorderManager 内置调用权限功能
          // 此时需要走 wx.authorize 授权，失败指引用户自己在设置中开启
          if (isRecord === false) {
            const title = '麦克风权限授权';
            const content = '发送语音消息，需要在设置中对麦克风进行授权允许';
            wx.authorize({ 
              scope: 'scope.record',
              success: () => {
                this.recorderStart();
              },
              fail: () => {
                this.handleShowModal(title, content);
                wx.hideLoading();
                this.setData({
                  text: '按住说话',
                  isRecording: false,
                });
              }
            });
          } else {
            this.recorderStart();
          }
        },
      });
    },

    recorderStart() {
      this.recorderManager.start({
        duration: 60000, // 录音的时长，单位 ms，最大值 600000（10 分钟）
        sampleRate: 44100, // 采样率
        numberOfChannels: 1, // 录音通道数
        encodeBitRate: 192000, // 编码码率
        format: 'aac', // 音频格式，选择此格式创建的音频消息，可以在即时通信 IM 全平台（Android、iOS、微信小程序和Web）互通
      });
    },

    // 长按录音
    handleLongPress(e) {
      this.setData({
        startPoint: e.touches[0],
        title: '正在录音',
        notShow: true,
        isShow: false,
        isRecording: true,
        popupToggle: true,
      });
    },

    // 录音时的手势上划移动距离对应文案变化
    handleTouchMove(e) {
      if (this.data.isRecording) {
        if (this.data.startPoint.clientY - e.touches[e.touches.length - 1].clientY > 100) {
          this.setData({
            text: '抬起停止',
            title: '松开手指，取消发送',
            canSend: false,
          });
        } else if (this.data.startPoint.clientY - e.touches[e.touches.length - 1].clientY > 20) {
          this.setData({
            text: '抬起停止',
            title: '上划可取消',
            canSend: true,
          });
        } else {
          this.setData({
            text: '抬起停止',
            title: '正在录音',
            canSend: true,
          });
        }
      } else {

      }
    },

    // 手指离开页面滑动
    handleTouchEnd() {
      this.setData({
        isRecording: false,
        popupToggle: false,
      });
      wx.hideLoading();
      this.recorderManager.stop();
    },
    // 选中表情消息
    handleEmoji() {
      let targetFlag = 'emoji';
      if (this.data.displayFlag === 'emoji') {
        targetFlag = '';
      }
      this.setData({
        isAudio: false,
        isEmoji: true,
        displayFlag: targetFlag,
        focus: false,
      });
    },

    // 选自定义消息
    handleExtensions() {
      let targetFlag = 'extension';
      if (this.data.displayFlag === 'extension') {
        targetFlag = '';
      }
      this.triggerEvent('inputHeightChange', {});
      this.setData({
        displayFlag: targetFlag,
      });
    },

    error(e) {
      console.log(e.detail);
    },

    handleSendPicture() {
      this.sendMediaMessage('camera', 'image');
    },

    handleSendImage() {
      this.sendMediaMessage('album', 'image');
    },

    sendMediaMessage(type, mediaType) {
      const { fileList } = this.data;
      wx.chooseMedia({
        count: 9,
        sourceType: [type],
        mediaType: [mediaType],
        success: (res) => {
          const mediaInfoList = res.tempFiles;
          mediaInfoList.forEach((mediaInfo) => {
            fileList.push({ type: res.type, tempFiles: [{ tempFilePath: mediaInfo.tempFilePath }] });
          });
          fileList.forEach((file) => {
            if (file.type === 'image') {
              this.handleSendImageMessage(file);
            }
            if (file.type === 'video') {
              this.handleSendVideoMessage(file);
            }
          });
          this.data.fileList = [];
        },
      });
    },

    // 发送图片消息
    handleSendImageMessage(file) {
      const message = wx.$TUIKit.createImageMessage({
        to: this.getToAccount(),
        conversationType: this.data.conversation.type,
        payload: {
          file,
        },
        onProgress: (percent) => {
          message.percent = percent;
        },
      });
      this.$sendTIMMessage(message);
    },

    // 发送视频消息
    handleSendVideoMessage(file) {
      const message = wx.$TUIKit.createVideoMessage({
        to: this.getToAccount(),
        conversationType: this.data.conversation.type,
        payload: {
          file,
        },
        onProgress: (percent) => {
          message.percent = percent;
        },
      });
      this.$sendTIMMessage(message);
    },

    handleShootVideo() {
      this.sendMediaMessage('camera', 'video');
    },

    handleSendVideo() {
      this.sendMediaMessage('album', 'video');
    },

    handleCommonFunctions(e) {
      const { commodity } = this.data;
      switch (e.target.dataset.function.key) {
        case '0':
          this.setData({
            displayCommonWords: true,
          });
          break;
        case '1':
          this.setData({
            displayOrderList: true,
          });
          break;
        case '2':
          this.setData({
            displayServiceEvaluation: true,
          });
          break;
        case '3': // 锁定
          api.lockCommodity(commodity._id);
          wx.showToast({
            title: '锁定成功',
            duration: 800,
            icon: 'success',
          });
          commodity.status = COMMODITY_STATUS_LOCKED;
          this.setData({ commodity });
          break;
        case '4': // 解锁
          if (commodity.status != COMMODITY_STATUS_LOCKED){
            wx.showToast({
              title: '商品不是已锁定',
              duration: 800,
              icon: 'error',
            });
            return;
          }
          api.unlockCommodity(commodity._id);
          wx.showToast({
            title: '解锁成功',
            duration: 800,
            icon: 'success',
          });
          commodity.status = COMMODITY_STATUS_SELLING;
          this.setData({ commodity });
          break;
        case '5': // 售出
          if (commodity.status != COMMODITY_STATUS_SELLING && commodity.status != COMMODITY_STATUS_LOCKED){
            wx.showToast({
              title: '商品不是可售出',
              duration: 800,
              icon: 'error',
            });
            return;
          }
          this.triggerEvent('sellCommodity');
          commodity.status = COMMODITY_STATUS_SOLD;
          this.setData({ commodity });
          break;
        default:
          break;
      }
    },

    handleSendOrder() {
      this.setData({
        displayOrderList: true,
      });
    },

    appendMessage(e) {
      this.setData({
        message: this.data.message + e.detail.message,
        sendMessageBtn: true,
      });
    },

    getToAccount() {
      if (!this.data.conversation || !this.data.conversation.conversationID) {
        return '';
      }
      switch (this.data.conversation.type) {
        case wx.TencentCloudChat.TYPES.CONV_C2C:
          return this.data.conversation.conversationID.replace(wx.TencentCloudChat.TYPES.CONV_C2C, '');
        case wx.TencentCloudChat.TYPES.CONV_GROUP:
          return this.data.conversation.conversationID.replace(wx.TencentCloudChat.TYPES.CONV_GROUP, '');
        default:
          return this.data.conversation.conversationID;
      }
    },
    async handleCheckAuthorize(e) {
      const type = e.currentTarget.dataset.value;
      wx.getSetting({
        success: async (res) => {
          const isRecord = res.authSetting['scope.record'];
          const isCamera = res.authSetting['scope.camera'];
          if (!isRecord && type === 1) {
            const title = '麦克风权限授权';
            const content = '使用语音通话，需要在设置中对麦克风进行授权允许';
            try {
              await wx.authorize({ scope: 'scope.record' });
              this.handleCalling(e);
            } catch (e) {
              this.handleShowModal(title, content);
            }
            return;
          }
          if ((!isRecord || !isCamera) && type === 2) {
            const title = '麦克风、摄像头权限授权';
            const content = '使用视频通话，需要在设置中对麦克风、摄像头进行授权允许';
            try {
              await wx.authorize({ scope: 'scope.record' });
              await wx.authorize({ scope: 'scope.camera' });
              this.handleCalling(e);
            } catch (e) {
              this.handleShowModal(title, content);
            }
            return;
          }
          this.handleCalling(e);
        },
      });
    },
    
    handleShowModal(title, content) {
      wx.showModal({
        title,
        content,
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting();
          }
        },
      });
    },

    handleCalling(e) {
      if (!this.data.hasCallKit) {
        wx.showToast({
          title: '请先集成 TUICallKit 组件',
          icon: 'none',
        });
        return;
      }
      const type = e.currentTarget.dataset.value;
      const conversationType = this.data.conversation.type;
      if (conversationType === wx.TencentCloudChat.TYPES.CONV_GROUP) {
        this.triggerEvent('handleCall', {
          type,
          conversationType,
        });
      }
      if (conversationType === wx.TencentCloudChat.TYPES.CONV_C2C) {
        const { userID } = this.data.conversation.userProfile;
        this.triggerEvent('handleCall', {
          conversationType,
          type,
          userID,
        });
      }
      this.setData({
        displayFlag: '',
      });
    },

    sendTextMessage(msg, flag) {
      const to = this.getToAccount();
      const text = flag ? msg : this.data.message;
      const { FEAT_NATIVE_CODE } = constant;
      const message = wx.$TUIKit.createTextMessage({
        to,
        conversationType: this.data.conversation.type,
        payload: {
          text,
        },
        cloudCustomData: JSON.stringify({ messageFeature:
        {
          needTyping: FEAT_NATIVE_CODE.FEAT_TYPING,
          version: FEAT_NATIVE_CODE.NATIVE_VERSION,
        },
        }),
      });
      this.setData({
        message: '',
        sendMessageBtn: false,
      });
      this.$sendTIMMessage(message);

      const commodity = app.globalData.config.commodity;
      if (commodity.status == COMMODITY_STATUS_SELLING){
        api.lockCommodity(commodity._id);
        commodity.status = COMMODITY_STATUS_LOCKED;
        wx.showToast({
          title: '商品锁定成功',
          duration: 800,
          icon: 'success',
        });
      }
    },

    // 监听输入框value值变化
    onInputValueChange(event) {
      const query = wx.createSelectorQuery().in(this);
      query.select('#textarea').boundingClientRect();
      query.exec((res) => {
        // 获取 textarea 组件的实际高度
        const height = res[0].height;
        if (this.data.textareaHeight !== height) {
          this.triggerEvent('inputHeightChange', {});
          this.setData({
            textareaHeight: height,
          })
        }
      });
      if (event.detail.message || event.detail.value) {
        this.setData({
          message: event.detail.message || event.detail.value,
          sendMessageBtn: true,
        });
      } else {
        this.setData({
          sendMessageBtn: false,
        });
      }
      event.detail.value && this.sendTypingStatusMessage();
    },

    // 发送正在输入状态消息
    sendTypingStatusMessage() {
      const { BUSINESS_ID_TEXT, FEAT_NATIVE_CODE } = constant;
      // 创建正在输入状态消息, "typingStatus":1,正在输入中1,  输入结束0, "version": 1 兼容老版本,userAction:0, // 14表示正在输入,actionParam:"EIMAMSG_InputStatus_Ing" //"EIMAMSG_InputStatus_Ing" 表示正在输入, "EIMAMSG_InputStatus_End" 表示输入结束
      const typingMessage = wx.$TUIKit.createCustomMessage({
        to: this.getToAccount(),
        conversationType: this.data.conversation.type,
        payload: {
          data: JSON.stringify({
            businessID: BUSINESS_ID_TEXT.USER_TYPING,
            typingStatus: FEAT_NATIVE_CODE.ISTYPING_STATUS,
            version: FEAT_NATIVE_CODE.NATIVE_VERSION,
            userAction: FEAT_NATIVE_CODE.ISTYPING_ACTION,
            actionParam: constant.TYPE_INPUT_STATUS_ING,
          }),
          description: '',
          extension: '',
        },
        cloudCustomData: JSON.stringify({
          messageFeature: {
            needTyping: FEAT_NATIVE_CODE.FEAT_TYPING,
            version: FEAT_NATIVE_CODE.NATIVE_VERSION,
          },
        }),
      });
        // 在消息列表中过滤出对方的消息，并且获取最新消息的时间。
      const inList =  this.data.messageList.filter(item => item.flow === 'in');
      if (inList.length === 0) return;
      const sortList = inList.sort((firstItem, secondItem) => secondItem.time - firstItem.time);
      const newMessageTime = sortList[0].time * 1000;
      // 发送正在输入状态消息的触发条件。
      const isSendTypingMessage = this.data.messageList.every((item) => {
        try {
          const sendTypingMessage = JSON.parse(item.cloudCustomData);
          return sendTypingMessage.messageFeature.needTyping;
        } catch (error) {
          return false;
        }
      });
        // 获取当前编辑时间，与收到对方最新的一条消息时间相比，时间小于30s则发送正在输入状态消息/
      const now = new Date().getTime();
      const timeDifference =  (now  - newMessageTime);

      if (isSendTypingMessage && timeDifference > (1000 * 30)) return;
      if (this.data.isFirstSendTyping) {
        this.$sendTypingMessage(typingMessage);
        this.setData({
          isFirstSendTyping: false,
        });
      } else {
        this.data.time = setTimeout(() => {
          this.$sendTypingMessage(typingMessage);
        }, (1000 * 4));
      }
    },

    // 监听是否获取焦点，有焦点则向父级传值，动态改变input组件的高度。
    inputBindFocus(event) {
      this.setData({
        focus: true,
      });
      this.getMessageList(this.data.conversation);
      this.triggerEvent('pullKeysBoards', {
        event,
      });
      // 有焦点则关闭除键盘之外的操作界面，例如表情组件。
      this.handleClose();
    },

    // 监听是否失去焦点
    inputBindBlur(event) {
      const { BUSINESS_ID_TEXT, FEAT_NATIVE_CODE } = constant;
      const typingMessage = wx.$TUIKit.createCustomMessage({
        to: this.getToAccount(),
        conversationType: this.data.conversation.type,
        payload: {
          data: JSON.stringify({
            businessID: BUSINESS_ID_TEXT.USER_TYPING,
            typingStatus: FEAT_NATIVE_CODE.NOTTYPING_STATUS,
            version: FEAT_NATIVE_CODE.NATIVE_VERSION,
            userAction: FEAT_NATIVE_CODE.NOTTYPING_ACTION,
            actionParam: constant.TYPE_INPUT_STATUS_END,
          }),
          cloudCustomData: JSON.stringify({ messageFeature:
              {
                needTyping: FEAT_NATIVE_CODE.FEAT_TYPING,
                version: FEAT_NATIVE_CODE.NATIVE_VERSION,
              },
          }),
          description: '',
          extension: '',
        },
      });
      this.$sendTypingMessage(typingMessage);
      this.setData({
        isFirstSendTyping: true,
      });
      clearTimeout(this.data.time);
      this.triggerEvent('downKeysBoards', {
        event,
      });
    },

    $handleSendTextMessage(event) {
      this.sendTextMessage(event.detail.message, true);
      this.setData({
        displayCommonWords: false,
      });
    },

    $handleSendCustomMessage(e) {
      const message = wx.$TUIKit.createCustomMessage({
        to: this.getToAccount(),
        conversationType: this.data.conversation.type,
        payload: e.detail.payload,
      });
      this.$sendTIMMessage(message);
      this.setData({
        displayOrderList: false,
        displayCommonWords: false,
      });
    },

    $handleCloseCards(e) {
      switch (e.detail.key) {
        case '0':
          this.setData({
            displayCommonWords: false,
          });
          break;
        case '1':
          this.setData({
            displayOrderList: false,
          });
          break;
        case '2':
          this.setData({
            displayServiceEvaluation: false,
          });
          break;
        default:
          break;
      }
    },
    // 发送正在输入消息
    $sendTypingMessage(message) {
      wx.$TUIKit.sendMessage(message, {
        onlineUserOnly: true,
      });
    },

    $sendTIMMessage(message) {
      this.triggerEvent('sendMessage', {
        message,
      });
      wx.$TUIKit.sendMessage(message, {
        offlinePushInfo: {
          disablePush: true,
        },
      }).catch((error) => {
          logger.log(`| TUI-chat | message-input | sendMessageError: ${error.code} `);
          this.triggerEvent('showMessageErrorImage', {
            showErrorImageFlag: error.code,
            message,
          });
        });
      this.setData({
        displayFlag: '',
      });
    },

    handleClose() {
      this.setData({
        displayFlag: '',
      });
    },

    handleServiceEvaluation() {
      this.setData({
        displayServiceEvaluation: true,
      });
    },
  },
});
