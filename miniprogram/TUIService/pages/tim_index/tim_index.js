import { setTabBar } from "../../../utils/other";

const app = getApp();

Page({
  data: {
    pageIndex: 2,
    ridToRegion: null,
    config: {
      // currentConversationID
    }
  },

  async onLoad(options) {
    setTabBar(this);
    await app.waitForReady();

    const TUIKit = this.selectComponent('#TUIKit');
    TUIKit.init();

    if (options.id){
      var user_id = decodeURIComponent(options.id);
      var conversation = TUIKit.selectComponent('#TUIConversation');
      conversation.searchUserID({ detail: { searchUserID: user_id } });
    }
  },

  async onShow(){
    const { currentUser, self } = app.globalData;
    if (currentUser){
      await app.loginIMWithID(currentUser);
      app.globalData.currentUser = null;
    } else {
      const user_id = 'USER' + self._id;
      await app.loginIMWithID(user_id);
      app.globalData.config.commodity = null;
    }
  },

  async isUserExists(id) {
    resp = await wx.$TUIKit.getUserStatus({ userIDList: [`${id}`] });
    const { users } = imResponse.data;
    const { userID, statusType, customStatus } = users[0];
    if (statusType === wx.TencentCloudChat.TYPES.USER_STATUS_ONLINE || statusType === wx.TencentCloudChat.TYPES.USER_STATUS_OFFLINE)
      return true;
    return false;
  },
});