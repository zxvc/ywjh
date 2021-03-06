// import { base64encode, judgeIsAnyNullStr, post, get } from "@/utils/index"
// import config from '@/config'
// import store from '../store/index'
// import qiniuUploader from '../utils/qiniuUploader'

//获取七牛上传token 并 初始化七牛相关参数
export function getQiniuToken() {
    get(config.qiniutoken).then(qnToken => {
        // console.log("qiniu upload token:" + qnToken)
        wx.setStorageSync('qnToken', qnToken)
        let options = {
            region: 'ECN', // 华东区
            uptoken: qnToken
        };
        qiniuUploader.init(options);
    })
}

// 微信拍照并七牛上传图片
export function chooseImage() {
    return new Promise((resolve, reject) => {
        wx.chooseImage({
            sizeType: ["original", "compressed"], // 可以指定是原图还是压缩图，默认二者都有
            sourceType: ["album", "camera"], // 可以指定来源是相册还是相机，默认二者都有
            count: 1,
            success: function (res) {
                let tempFilePaths = res.tempFilePaths[0];
                wx.showLoading({
                    title: '正在上传图片',
                })
                qiniuUploader.upload(
                    tempFilePaths,
                    res => {
                        wx.hideLoading()
                        let image = getImgRealUrl(res.key);
                        resolve(image)
                    },
                    error => {
                        console.error("七牛上传图片err: " + JSON.stringify(error));
                        reject(error)
                    }
                );
            },
            fail: function (err) {
                console.error("微信上传图片err: " + JSON.stringify(error));
            }
        });
    })
}

// 七牛上传图片
export function ctxQiniuUpload() {
    return new Promise((resolve, reject) => {
        showLoading("上传中")
        const ctx = wx.createCameraContext();
        ctx.takePhoto({
            quality: "high",
            success: res => {
                qiniuUploader.upload(res.tempImagePath, res => {
                    wx.hideLoading()
                    let image = getImgRealUrl(res.key);
                    wx.hideLoading()
                    resolve(image)
                }, error => {
                    console.error("七牛上传图片err: " + JSON.stringify(error));
                    wx.hideLoading()
                    reject(error)
                }
                );
            },
            fail: err => {
                wx.hideLoading()
                console.log("拍照错误：：" + JSON.stringify(err));
            }
        });

    })
}

//七牛上传视频
export function chooseVideo() {
    return new Promise((resolve, reject) => {
        wx.chooseVideo({
            sourceType: ['album', 'camera'],
            maxDuration: 60,
            camera: 'back',
            success: function (res) {
                var tempFilePath = res.tempFilePath
                wx.showLoading({
                    title: '正在上传视频',
                })
                qiniuUploader.upload(tempFilePath, (res) => {
                    wx.hideLoading();
                    var video = getImgRealUrl(res.key)
                    resolve(video)
                }, (error) => {
                    reject(error)
                    console.error("七牛上传视频err: " + JSON.stringify(error));
                })
            },
            fail: function (err) {
                reject(error)
                console.error("微信上传图片err: " + JSON.stringify(error));
            }
        })
    });
}

// 转换真实地址
function getImgRealUrl(key) {
    return 'http://twst.isart.me/' + key
}

// 微信登陆拿code
export function wxLogin() {
    return new Promise((resolve, reject) => {
        //登录
        wx.login({
            success: res => {
                // console.log("wxlogin成功:" + JSON.stringify(res.code));
                resolve(res.code)
            },
            fail: err => {
                console.log("wxlogin错误:" + JSON.stringify(err));
                reject(err)
            }
        });
    })
}

//微信支付
export function wxPay(payParam) {
    return new Promise((resolve, reject) => {
        wx.requestPayment({
            timeStamp: payParam.timeStamp,
            nonceStr: payParam.nonceStr,
            package: payParam.package,
            signType: payParam.signType,
            paySign: payParam.paySign,
            success(res) {
                resolve(res)
                showToast("支付成功")
            },
            fail(err) {
                showToast("您取消了支付")
                console.log("微信支付错误:" + JSON.stringify(err));
                reject(err)
            }
        })
    })
}

//获取窗口可用高度
export function getWindowHeight() {
    try {
        const res = wx.getSystemInfoSync()
        let windowHeight = res.windowHeight; //可用窗口高度
        store.commit("SET_WINDOWHEIGHT", windowHeight);
        return windowHeight
    } catch (e) {
        console.log("获取可用窗口高度错误:" + JSON.stringify(e));
    }
}

export async function judgeStorageUserInfo() {
    let userInfo_storage = wx.getStorageSync("userInfo");
    // 如果本地没有缓存
    if (judgeIsAnyNullStr(userInfo_storage)) {
        let userInfo_code = await auth_login();
        console.log("-----" + JSON.stringify(userInfo_code));
        if (judgeIsAnyNullStr(userInfo_code.nick_name)) {
            wx.reLaunch({
                url: '/pages/authorization'
            })
        }
    } else {
        if (judgeIsAnyNullStr(userInfo_storage.nick_name)) {
            wx.reLaunch({
                url: '/pages/authorization'
            })
        }
    }
}
//调用微信的getUserInfo获取用户信息
async function wxGetUserInfo() {
    return new Promise((resolve, reject) => {
        wx.getUserInfo({
            success: function (res) {
                var userInfo = res.userInfo
                resolve(userInfo)
            },
            fail: function (err) {
                console.log("微信的getUserInfo错误：" + JSON.stringify(err))
            }
        })
    })
}
//根据编号更新用户信息
export async function updateUserinfo() {
    let userInfo_new = await wxGetUserInfo()
    let param = {
        gender: userInfo_new.gender,               //性别 0：未知、1：男、2：女
        nick_name: userInfo_new.nickName,
        avatar: userInfo_new.avatarUrl,
        country: userInfo_new.country,
        province: userInfo_new.province,
        city: userInfo_new.city,
        language: userInfo_new.language,
    }
    let userInfo = await post(config.auth_updateById, param)
    wx.setStorageSync('userInfo', userInfo)

    console.log("根据编号更新用户信息:" + JSON.stringify(userInfo))
    return userInfo
}
//消息解密并登陆
export async function updateUpdate(encrypted_data, iv) {
    let code = await wxLogin()
    // console.log("wxLogin成功：" + code);
    console.log("code：" + JSON.stringify(code));
    let wechat_decryptData_param = {
        code: code,
        encryptedData: base64encode(encrypted_data),
        iv: base64encode(iv)
    };
    let wechat_decryptData_res = await post(config.wechat_decryptData, wechat_decryptData_param)
    // console.log("消息解密接口成功：" + JSON.stringify(wechat_decryptData_res));
    let old_userInfo = wx.getStorageSync("userInfo");
    let user_id = old_userInfo.id;
    let new_userInfo = wechat_decryptData_res;
    let user_updateById_param = {
        user_id: user_id,
        avatar: new_userInfo.avatarUrl,
        nick_name: new_userInfo.nickName,
        gender: new_userInfo.gender,
        country: new_userInfo.country,
        province: new_userInfo.province,
        city: new_userInfo.city,
        language: new_userInfo.language
    };
    let user_updateById_res = await post(config.user_updateById, user_updateById_param)
    // console.log("根据id编辑用户信息接口调用成功" + JSON.stringify(user_updateById_res));
    let userInfo = user_updateById_res;
    wx.setStorageSync('userInfo', wechat_login_res)
    return userInfo
}
//根据code查询用户信息
export async function auth_login() {
    let code = await wxLogin()
    // console.log("code::：" + JSON.stringify(code));
    let wechat_login_res = await post(config.auth_login, { account_type: "xcx", code })
    console.log("登陆成功接口调用成功：" + JSON.stringify(wechat_login_res));
    wx.setStorageSync('userInfo', wechat_login_res)
    return wechat_login_res
}
//更新小程序
export function updataXcx() {
    // 获取小程序更新机制兼容
    if (wx.canIUse('getUpdateManager')) {
        const updateManager = wx.getUpdateManager()
        updateManager.onCheckForUpdate(function (res) {
            // console.log("是否有更新：" + JSON.stringify(res.hasUpdate))
            // 请求完新版本信息的回调
            if (res.hasUpdate) {
                updateManager.onUpdateReady(function () {
                    wx.showModal({
                        title: '更新提示',
                        content: '新版本已经准备好，是否重启应用？',
                        success: function (res) {
                            if (res.confirm) {
                                // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                                updateManager.applyUpdate()
                            }
                        }
                    })
                })
                updateManager.onUpdateFailed(function () {
                    // 新的版本下载失败
                    wx.showModal({
                        title: '已经有新版本了哟~',
                        content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~',
                    })
                })
            }
        })
    } else {
        // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
        wx.showModal({
            title: '提示',
            content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
        })
    }
}
//判断是否授权过
export function getSetting(authType) {
    return new Promise((resolve, reject) => {
        wx.getSetting({
            success: (res) => {
                // 是否授权过
                if (!res.authSetting[authType]) {
                    wx.authorize({
                        scope: authType,
                        success(res) {
                            // console.log("哈哈哈:::" + JSON.stringify(res));
                            resolve(true)
                        },
                        fail() {
                            console.log("授权失败：" + authType)
                            reject(false)
                        }
                    })
                } else {
                    // console.log("哈哈哈:::" + JSON.stringify(res));
                    resolve(true)
                }
            },
            fail: (err) => {
                console.log("getSetting错误：" + JSON.stringify(err))
                reject(false)
            }
        })
    })
}
export function showToast(title) {
    wx.showToast({
        title,
        icon: 'none',
        duration: 2000
    })
}
//展示Modal
export function showModal(title, content, showCancel = false, call) {
    wx.showModal({
        title,
        content,
        showCancel,
        success(res) {
            if (res.confirm) {
                call(true)
            } else if (res.cancel) {
                call(false)
            }
        }
    })
}
//展示loadding
export function showLoading(title) {
    if (!wx.canIUse('showLoading')) {
        return;
    }
    if (judgeIsAnyNullStr(title)) {
        title = "加载中";
    }
    wx.showLoading({
        title
    })
}
export default {
    wxLogin,
    updateUpdate,
    auth_login,
    getWindowHeight,
    getQiniuToken,
    chooseImage
}