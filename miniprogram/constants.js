export const COMMODITY_STATUS_SELLING = 0; // 出售中
export const COMMODITY_STATUS_OFF = 1; // 已下架
export const COMMODITY_STATUS_SOLD = 2; // 已售出
export const COMMODITY_STATUS_LOCKED = 3; // 已锁定

export const GENDER = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
}

export default function getConstants() {
  const app = getApp();
  return {
    COMMODITY_STATUS_SELLING,
    COMMODITY_STATUS_OFF,
    COMMODITY_STATUS_SOLD,
    COMMODITY_STATUS_LOCKED,
    CustomBar: app.globalData.CustomBar,
    StatusBar: app.globalData.StatusBar,
  };
};