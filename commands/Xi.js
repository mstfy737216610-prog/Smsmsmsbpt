/*
  Command: Xi
  Description: Real live number order execution
*/

var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;
var api_key = Bot.getProperty("5sim_api_key") || "";

if (!api_key) {
  var no_key_msg = "⚠️ *تنبيه المالك:* لم يتم ضبط مفتاح API لموقع 5sim.biz بعد!\n\n" +
    "بصفتك تاجراً ومورداً، قم بإدخال مفتاح الـ API من داخل البوت عبر أمر `/counapi` أو عبر لوحة التحكم السحابية ليتم جلب الأرقام الحقيقية فورياً.";
  
  Api.sendMessage({
    chat_id: target_chat_id,
    text: no_key_msg,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [ { text: "🔑 إدخال مفتاح الـ API الآن", callback_data: "counapi" } ],
        [ { text: "- رجوع 🔙", callback_data: "/start" } ]
      ]
    }
  });
  return;
}

// Inform user
Api.sendMessage({
  chat_id: target_chat_id,
  text: "⏳ *جاري الاتصال بسيرفرات التوريد الحقيقية وجلب رقم متاح لك... يرجى الانتظار ثوانٍ*",
  parse_mode: "Markdown"
});

// Real HTTP call to 5sim.biz
HTTP.get({
  url: "https://5sim.biz/v1/user/buy/activation/russia/any/whatsapp",
  headers: {
    "Authorization": "Bearer " + api_key,
    "Accept": "application/json"
  },
  success: "onRealNumberPurchased",
  error: "onRealNumberError"
});
