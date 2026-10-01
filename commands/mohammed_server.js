/*
  Command: mohammed_server
  Description: Dedicated Server Settings for Mohammed's Website
*/

var admin_id = "8338869162";
var user_id = "" + (user.telegramid || "");
var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;

if (user_id !== admin_id) return;

var url = Bot.getProperty("mohammed_server_url") || "https://mohammed-sms.api/v1";
var key = Bot.getProperty("mohammed_server_key") || "MOHAMMED_VIP_SECURE_KEY_8338869162";
var profit = Bot.getProperty("mohammed_server_profit") || "2.0";
var is_active = Bot.getProperty("mohammed_server_active") !== false;

var text = "👑 *إعدادات سيرفر موقع محمد المخصص:*\n\n" +
  "📡 *رابط السيرفر:* `" + url + "`\n" +
  "🔑 *مفتاح الـ API:* `" + key.substring(0, 15) + "...`\n" +
  "💰 *نسبة الربح المضافة:* `" + profit + " ₽`\n" +
  "🚦 *الحالة:* " + (is_active ? "مفعل ويعمل كسيرفر رئيسي ✅" : "معطل ❌") + "\n\n" +
  "تستطيع تعديل الرابط أو المفتاح أو نسبة الربح مباشرة عبر الأزرار أدناه:";

var keyboard = [
  [
    { text: is_active ? "تعطيل السيرفر ❌" : "تفعيل السيرفر ✅", callback_data: "toggle_mohammed_server" }
  ],
  [
    { text: "✏️ تغيير رابط موقع محمد", callback_data: "edit_mohammed_url" },
    { text: "🔑 تغيير مفتاح API", callback_data: "edit_mohammed_key" }
  ],
  [
    { text: "💵 تعديل نسبة الربح بالروبل", callback_data: "edit_mohammed_profit" },
    { text: "🔄 فحص اتصال ورصيد السيرفر", callback_data: "test_mohammed_server" }
  ],
  [
    { text: "🔙 رجوع للوحة الأدمن", callback_data: "admin_panel" }
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
