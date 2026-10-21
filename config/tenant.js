// Phase 1：多租戶資料模型尚未做業者自助註冊/網域對應（Phase 4），
// 目前唯一一個租戶固定用這個 ID，之後接網域對應時只需要換掉這裡的來源
module.exports = {
    DEFAULT_TENANT_ID: "default"
};
