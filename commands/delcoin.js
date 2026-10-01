/*
  Command: delcoin
  Description: Deduct balance from a user account
*/

var admin_id = "8338869162";
var user_id = "" + (user.telegramid || "");

if (user_id !== admin_id) return;

if (!params) {
  var prompt_msg = "📛 *خصم رصيد روبل من حساب عميل:*\n\n" +
    "أرسل الأمر مع أيدي العضو والمبلغ بالشكل التالي:\n" +
    "`/delcoin <Telegram_ID> <المبلغ>`\n\n" +
    "مثال:\n`/delcoin 123456789 20`";

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

Bot.sendMessage("📛 *تم خصم " + amount + " ₽ بنجاح* من حساب العضو `" + target_user + "`.", {
  parse_mode: "Markdown"
});
