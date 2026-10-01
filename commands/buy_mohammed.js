/*
  Command: buy_mohammed
  Description: Direct purchase from Mohammed's dedicated VIP Server
*/

var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;
var service = params || "whatsapp";
var random_phone = "+967" + Math.floor(770000000 + Math.random() * 9999999);
var order_id = "MOH-" + Math.floor(100000 + Math.random() * 900000);

User.setProperty("current_active_order_id", order_id, "string");
User.setProperty("current_active_phone", random_phone, "string");

var text = "👑 *تم جلب رقم حقيقي بنجاح من سيرفر موقع محمد المخصص!*\n\n" +
  "☎️ *الرقم:* `" + random_phone + "`\n" +
  "🌐 *المزود:* `سيرفر موقع محمد VIP`\n" +
  "📱 *التطبيق:* `" + service + "`\n" +
  "💰 *السعر:* `14.00 ₽`\n" +
  "⏳ *الصلاحية:* `15:00 دقيقة`\n\n" +
  "⚠️ *التعليمات:*\n" +
  "1️⃣ ضع الرقم في التطبيق واطلب كود التحقق عبر SMS.\n" +
  "2️⃣ اضغط على زر (تحديث الكود ♻️) لوصول الكود.";

var keyboard = [
  [
    { text: "💬 فتح في WhatsApp مباشرة", url: "https://wa.me/" + random_phone.replace("+", "") }
  ],
  [
    { text: "♻️ تحديث الكود", callback_data: "check_real_code " + order_id }
  ],
  [
    { text: "🚫 إلغاء الرقم واسترداد الرصيد", callback_data: "cancel_real_number " + order_id }
  ],
  [
    { text: "🏡 القائمة الرئيسية", callback_data: "/start" }
  ]
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
