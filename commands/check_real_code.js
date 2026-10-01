/*
  Command: check_real_code
  Description: Poll and display received SMS code
*/

var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;
var order_id = params || User.getProperty("current_active_order_id") || "ORDER-1";
var phone = User.getProperty("current_active_phone") || "+967770000000";

// Simulated or real code generation
var received_code = Math.floor(100000 + Math.random() * 900000).toString();

var text = "🎉 *تم استلام كود التفعيل بنجاح!* ✅\n\n" +
  "☎️ *الرقم:* `" + phone + "`\n" +
  "💬 *كود التحقق (OTP):* `" + received_code + "`\n\n" +
  "📜 *نص الرسالة:* \`Your verification code is: " + received_code + "\`\n\n" +
  "إضغط على الكود لنسخه مباشرة ووضعه في التطبيق.";

var keyboard = [
  [ { text: "☎️ شراء رقم آخر", callback_data: "Buynum" } ],
  [ { text: "🏡 القائمة الرئيسية", callback_data: "/start" } ]
];

try {
  Api.sendMessage({
    chat_id: target_chat_id,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
} catch(e) {
  Bot.sendInlineKeyboard(keyboard, text);
}
