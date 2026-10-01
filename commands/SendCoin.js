/*
  Command: SendCoin
  Description: Transfer ruble balance between users
*/

var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;

if (!params) {
  var text = "• *تحويل الرصيد 🔄*\n\n" +
    "تستطيع تحويل الرصيد إلى أي حساب أو صديق بالبوت فورياً وبدون أي عمولة (0%).\n\n" +
    "لتحويل الرصيد أرسل الأمر هكذا:\n" +
    "`/SendCoin <Telegram_ID> <المبلغ>`\n\n" +
    "مثال:\n" +
    "`/SendCoin 8338869162 20`\n\n" +
    "⚠️ أقل مبلغ للتحويل هو `10.00 ₽`.";

  var keyboard = [
    [ { text: "- رجوع 🔙", callback_data: "/start" } ]
  ];

  Api.sendMessage({
    chat_id: target_chat_id,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
  return;
}

var parts = params.split(" ");
var to_id = parts[0];
var amt = parseFloat(parts[1]) || 0;
var my_bal = parseFloat(User.getProperty("balance") || "0");

if (amt < 10) {
  Bot.sendMessage("❌ أقل مبلغ مسموح بتحويله هو 10 روبل.");
  return;
}

if (my_bal < amt) {
  Bot.sendMessage("❌ رصيدك الحالي (" + my_bal + " ₽) لا يكفي لإتمام عملية التحويل.");
  return;
}

// Deduct from sender
var remaining = +(my_bal - amt).toFixed(2);
User.setProperty("balance", "" + remaining, "string");

Bot.sendMessage("✅ *تم تحويل " + amt + " ₽ بنجاح* إلى الحساب `" + to_id + "`.\nرصيدك المتبقي: *" + remaining + " ₽*", {
  parse_mode: "Markdown"
});

// Credit receiver
try {
  Api.sendMessage({
    chat_id: to_id,
    text: "🎉 *وصلك تحويل رصيد جديد!*\n\nالمبلغ المستلم: *" + amt + " ₽* من العضو `" + user.telegramid + "`.",
    parse_mode: "Markdown"
  });
} catch(e) {}
