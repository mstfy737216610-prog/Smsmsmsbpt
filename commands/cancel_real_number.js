/*
  Command: cancel_real_number
  Description: Cancel number and refund balance
*/

var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;

User.setProperty("current_active_order_id", null);
User.setProperty("current_active_phone", null);

var text = "🚫 *تم إلغاء الرقم بنجاح واسترداد الرصيد إلى محفظتك بالكامل.* ✅\n\n" +
  "لم يتم خصم أي روبل من حسابك لأن الكود لم يُستلم.";

var keyboard = [
  [ { text: "☎️ شراء رقم من سيرفر آخر", callback_data: "Buynum" } ],
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
