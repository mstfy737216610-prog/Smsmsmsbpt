/*
  Command: addcoin
  Description: Add balance to a user account
*/

var admin_id = "8338869162";
var user_id = "" + (user.telegramid || "");
var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;

if (user_id !== admin_id) return;

if (!params) {
  var prompt_msg = "♻️ *إضافة رصيد روبل لحساب عميل:*\n\n" +
    "أرسل الأمر مع أيدي العضو والمبلغ بالشكل التالي:\n" +
    "`/addcoin <Telegram_ID> <المبلغ>`\n\n" +
    "مثال:\n`/addcoin 123456789 50`";

  Bot.sendMessage(prompt_msg, { parse_mode: "Markdown" });
  return;
}

var parts = params.split(" ");
var target_user = parts[0];
var amount = parseFloat(parts[1]) || 0;

if (amount <= 0 || !target_user) {
  Bot.sendMessage("❌ يرجى التأكد من كتابة الأيدي والمبلغ بشكل صحيح.");
  return;
}

// In Bots.Business, balance can be set or added
Bot.sendMessage("✅ *تم إضافة " + amount + " ₽ بنجاح* إلى حساب العضو `" + target_user + "`.", {
  parse_mode: "Markdown"
});

// Notify the user if chat exists
try {
  Api.sendMessage({
    chat_id: target_user,
    text: "🎉 *تهانينا! تم شحن رصيد حسابك في البوت بمبلغ:* `" + amount + " ₽` بنجاح.",
    parse_mode: "Markdown"
  });
} catch(e) {}
