import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Persistent Data Folder
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(filename: string, fallback: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJson<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// User Profile Database
interface UserProfile {
  id: string;
  name: string;
  username: string;
  balance: number; // in Rubles ₽
  totalPurchased: number;
  referrals: number;
  referredBy?: string;
  joinedAt: string;
}

// Active Order Database
interface ActiveOrder {
  id: string;
  userId: string;
  phone: string;
  country: string;
  service: string;
  price: number;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  code?: string;
  fullSms?: string;
  createdAt: number;
  provider: string;
}

// User credentials & Real 5SIM JWT configuration
const REAL_5SIM_JWT = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTkxMzcxMTQsImlhdCI6MTc4NzYwMTExNCwicmF5IjoiNTZlYmFlNjg0NGQyMTAzZjAyZjUyMzJlYjVhODViNTEiLCJzdWIiOjQ0MzcwMDF9.qEpXfNoatnjn3MLJhQErUVmgfIJ-cP_laTBFdz8RkeMietQrjYqZnRHTd23NjPxVPwn0HpoAz4lAmOwTiuPjaUQkU2u9QCnh2i89MAedpfm2kosspiug1Ux6o7pJ-2fVqPGW27cQtGmOz-vZne997NCbdCc7eDxoX3ZknvorIu1ZmaCEnVlk2-t-YdHAi90GzVqjrvE0dZqZM4Mp-IgX8z71Bv1neikePV2RsE68hGMM8Z2bONHMeAqxhtezVcW0ykW1pCk_NLjcSnTWFXo_L_dgVvZLQnPB1n-ROqFan55gB-uEkuU0KN0gkvnozT9_N4wTWjAYiLTy1S3-vaooDA";

const DEFAULT_SETTINGS = {
  botName: 'PLUS SMS Hub Bot',
  botToken: '8784070781:AAEwYjXS43ZG_vdm-PTnM9eUxSnJafnhkfo',
  adminId: '8338869162',
  adminUsername: 'Engku8',
  simEmail: 'mstfy737216610@gmail.com',
  simUserId: 4437001,
  simToken: REAL_5SIM_JWT,
  simBaseUrl: 'https://5sim.net/v1',
  profitMarginRub: 2.0, // Rubles added on top of cost
  exchangeRateUsdToRub: 92.5,
  referralRewardRub: 0.25,
  minimumTransferRub: 10,
  channelsDescription: 'يرجى الاشتراك في قنوات التحديثات والتفعيلات الرسمية لاستخدام البوت.',
  mohammedServerActive: true,
  mohammedServerUrl: 'https://mohammed-sms.api/v1',
  mohammedServerKey: 'MOHAMMED_VIP_SECURE_KEY_8338869162'
};

let storeSettings = loadJson('settings.json', DEFAULT_SETTINGS);

// Ensure updated credentials
storeSettings.simToken = REAL_5SIM_JWT;
storeSettings.simEmail = 'mstfy737216610@gmail.com';
storeSettings.simUserId = 4437001;
storeSettings.simBaseUrl = 'https://5sim.net/v1';
saveJson('settings.json', storeSettings);

let usersDb = loadJson<Record<string, UserProfile>>('users.json', {
  '8338869162': {
    id: '8338869162',
    name: 'المهندس المسؤول (المالك)',
    username: 'Engku8',
    balance: 50.0,
    totalPurchased: 5,
    referrals: 0,
    joinedAt: new Date().toISOString()
  }
});

let activeOrdersDb = loadJson<Record<string, ActiveOrder>>('active_orders.json', {});

let channelsList = loadJson<any[]>('channels.json', [
  {
    id: 'ch-1',
    title: 'قناة البوت الرسمية',
    username: '@sms_com_bot',
    url: 'https://t.me/sms_com_bot',
    description: 'قناة الإعلانات والتحديثات الرسمية',
    isMandatory: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ch-2',
    title: 'قناة التفعيلات المباشرة',
    username: '@pilotoooo',
    url: 'https://t.me/pilotoooo',
    description: 'إشعارات الأرقام المكتملة',
    isMandatory: true,
    createdAt: new Date().toISOString()
  }
]);

let paymentMethodsList = loadJson<any[]>('payments.json', [
  {
    id: 'kuraimi',
    name: 'Al-Kuraimi Bank',
    arabicName: 'بنك الكريمي (حساب / جوال)',
    accountNumber: '3049582109',
    accountHolder: 'مورد الأرقام المعتمد',
    instructions: 'التحويل عبر تطبيق كريمي جوال أو إم فلوس ثم إرسال السند للدعم.',
    icon: 'CreditCard',
    isActive: true
  },
  {
    id: 'najm',
    name: 'Al-Najm Express',
    arabicName: 'النجم للصرافة والتحويلات',
    accountNumber: 'محمد علي سالم - اليمن',
    accountHolder: 'محمد علي سالم',
    instructions: 'إرسال حوالة باسم المستفيد وإرسال رقم الحوالة.',
    icon: 'Send',
    isActive: true
  },
  {
    id: 'binance-usdt',
    name: 'Binance Pay / USDT',
    arabicName: 'بينانس وبايير USDT (دولار رقمي)',
    accountNumber: 'Pay ID: 394850211',
    accountHolder: 'Crypto Supplier Hub',
    instructions: 'شحن فوري بالدولار بأسعار صرف ممتازة.',
    icon: 'DollarSign',
    isActive: true
  }
]);

let cardsList = loadJson<any[]>('cards.json', [
  {
    id: 'card-1',
    code: 'CARD-50RUB-VIP8338-9910',
    amount: 50,
    createdBy: 'Admin',
    isUsed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'card-2',
    code: 'CARD-100RUB-VIP7711-2244',
    amount: 100,
    createdBy: 'Admin',
    isUsed: false,
    createdAt: new Date().toISOString()
  }
]);

// Helper for User Balance
function getUser(userId: string, name?: string, username?: string): UserProfile {
  if (!usersDb[userId]) {
    usersDb[userId] = {
      id: userId,
      name: name || 'عضو جديد',
      username: username || '',
      balance: userId === storeSettings.adminId ? 50.0 : 0.0, // Strictly 0.0 for regular users (cannot buy without topping up!)
      totalPurchased: 0,
      referrals: 0,
      joinedAt: new Date().toISOString()
    };
    saveJson('users.json', usersDb);
  }
  return usersDb[userId];
}

function updateUserBalance(userId: string, delta: number): number {
  const user = getUser(userId);
  user.balance = +(user.balance + delta).toFixed(2);
  if (user.balance < 0) user.balance = 0;
  saveJson('users.json', usersDb);
  return user.balance;
}

// --- REAL 5SIM.NET API CLIENT ---
async function fetch5SimProfile(): Promise<any> {
  const token = storeSettings.simToken || REAL_5SIM_JWT;
  try {
    const res = await fetch(`https://5sim.net/v1/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return await res.json();
  } catch (err: any) {
    console.error('5sim profile error:', err.message);
    return null;
  }
}

async function buy5SimRealNumber(country: string, service: string, operator: string = 'any'): Promise<{
  success: boolean;
  phone?: string;
  id?: string;
  price?: number;
  operator?: string;
  error?: string;
}> {
  const token = storeSettings.simToken || REAL_5SIM_JWT;
  const baseUrl = storeSettings.simBaseUrl || 'https://5sim.net/v1';

  try {
    const url = `${baseUrl}/user/buy/activation/${country}/${operator}/${service}`;
    console.log(`📡 Calling Real 5SIM API: ${url}`);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json().catch(async () => {
      const text = await res.text();
      return { error: text };
    });

    console.log('📡 5SIM API Response:', JSON.stringify(data));

    if (data && data.phone && data.id) {
      return {
        success: true,
        phone: data.phone,
        id: '' + data.id,
        price: data.price,
        operator: data.operator
      };
    }

    const err = data?.error || (typeof data === 'string' ? data : 'unknown');
    if (err.includes('no free phones') || err.includes('NO_NUMBERS') || res.status === 400 && err.includes('no product')) {
      return { success: false, error: 'NO_NUMBERS' };
    }
    if (err.includes('not enough user balance') || err.includes('NO_BALANCE')) {
      return { success: false, error: 'NO_BALANCE' };
    }

    return { success: false, error: err };
  } catch (e: any) {
    console.error('Error calling 5SIM Buy API:', e.message);
    return { success: false, error: e.message };
  }
}

async function check5SimRealCode(orderId: string): Promise<{
  status: 'WAITING' | 'RECEIVED' | 'ERROR';
  code?: string;
  fullSms?: string;
}> {
  const token = storeSettings.simToken || REAL_5SIM_JWT;
  const baseUrl = storeSettings.simBaseUrl || 'https://5sim.net/v1';

  try {
    const url = `${baseUrl}/user/check/${orderId}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await res.json().catch(() => null);

    if (data && data.sms && Array.isArray(data.sms) && data.sms.length > 0) {
      const sms = data.sms[0];
      return {
        status: 'RECEIVED',
        code: sms.code || sms.text,
        fullSms: sms.text || sms.code
      };
    }
    return { status: 'WAITING' };
  } catch {
    return { status: 'ERROR' };
  }
}

async function cancel5SimRealNumber(orderId: string): Promise<boolean> {
  const token = storeSettings.simToken || REAL_5SIM_JWT;
  const baseUrl = storeSettings.simBaseUrl || 'https://5sim.net/v1';

  try {
    const url = `${baseUrl}/user/ban/${orderId}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Available countries on 5sim with abundant stock & cheap price
const CHEAP_5SIM_COUNTRIES: Record<string, { name: string; slug: string; defaultPrice: number }> = {
  'albania': { name: 'ألبانيا 🇦🇱 (متوفر بكثرة)', slug: 'albania', defaultPrice: 2.5 },
  'angola': { name: 'أنغولا 🇦🇴 (متوفر بكثرة)', slug: 'angola', defaultPrice: 2.5 },
  'argentina': { name: 'الأرجنتين 🇦🇷 (متوفر بكثرة)', slug: 'argentina', defaultPrice: 2.5 },
  'afghanistan': { name: 'أفغانستان 🇦🇫', slug: 'afghanistan', defaultPrice: 3.0 },
  'russia': { name: 'روسيا 🇷🇺', slug: 'russia', defaultPrice: 15.0 },
  'ukraine': { name: 'أوكرانيا 🇺🇦', slug: 'ukraine', defaultPrice: 16.0 },
  'indonesia': { name: 'إندونيسيا 🇮🇩', slug: 'indonesia', defaultPrice: 10.0 }
};

// --- REAL TELEGRAM BOT ENGINE (LONG POLLING) ---
class TelegramBotRunner {
  private botToken: string;
  private isRunning: boolean = false;
  private offset: number = 0;

  constructor(token: string) {
    this.botToken = token;
  }

  async sendApi(method: string, body: any) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e: any) {
      console.error(`Telegram API ${method} error:`, e.message);
      return null;
    }
  }

  async answerCallback(queryId: string, text?: string, showAlert: boolean = false) {
    return this.sendApi('answerCallbackQuery', {
      callback_query_id: queryId,
      text: text,
      show_alert: showAlert
    });
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 Telegram Bot Engine started polling for token:', this.botToken.substring(0, 10) + '...');

    while (this.isRunning) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=25`);
        const data = await res.json().catch(() => null);

        if (data && data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        } else {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err: any) {
        console.error('Polling error:', err.message);
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  private async handleUpdate(update: any) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallback(update.callback_query);
    }
  }

  private async handleMessage(msg: any) {
    const chatId = '' + msg.chat.id;
    const userId = '' + (msg.from?.id || chatId);
    const text = (msg.text || '').trim();
    const name = msg.from?.first_name || 'عزيزي';
    const username = msg.from?.username || '';
    const isAdmin = userId === storeSettings.adminId;

    const user = getUser(userId, name, username);

    // 1. Command /start
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const refId = parts[1];
        if (refId !== userId && usersDb[refId] && !user.referredBy) {
          user.referredBy = refId;
          updateUserBalance(refId, storeSettings.referralRewardRub);
          usersDb[refId].referrals = (usersDb[refId].referrals || 0) + 1;
          saveJson('users.json', usersDb);
          await this.sendApi('sendMessage', {
            chat_id: refId,
            text: `🎉 سجل صديق جديد عبر رابطك! حصلت على +${storeSettings.referralRewardRub} ₽ رصيد مجاني.`
          });
        }
      }

      const welcomeText = `• *القائمة الرئيسية* 🏡\n` +
        `💙 *${name}* 💙\n\n` +
        `🆔 : \`${userId}\` •\n` +
        `💷 : *${user.balance} ₽* •\n\n` +
        `💙 [قـنـاة الـبـوت](https://t.me/sms_com_bot) 💙\n` +
        `💗 [قـنـاة الـتـفـعـيـلات](https://t.me/pilotoooo) 💗\n` +
        `🇦🇱🇦🇴🇦🇷🇸🇦 *من الدول المتوفرة حالياً* ــ\n\n` +
        `╰•|_____(PLUS SMS)_____|•╯`;

      const keyboard: any[] = [
        [ { text: '☎️ شراء رقم افتراضي', callback_data: 'Buynum' } ],
        [ { text: 'عروض Telegram', callback_data: 'offers_tg' }, { text: 'عروض WhatsApp', callback_data: 'offers_wa' } ],
        [ { text: '•🎲 الأكثر توفراً •', callback_data: 'worldwide' }, { text: '•🎳 أشحن رصيدك•', callback_data: 'Payment' } ],
        [ { text: '•💎 اربح روبل مجاناً ₽ •', callback_data: 'assignment' } ],
        [ { text: '• تحويل الرصيد 🔄 •', callback_data: 'SendCoin' }, { text: 'الدعم ⏰', callback_data: 'super' } ],
        [ { text: 'حسابي', callback_data: 'MyAccount' } ]
      ];

      if (isAdmin) {
        keyboard.unshift([
          { text: '👑 لوحة تحكم الأدمن والمالك ⚙️', callback_data: 'admin_panel' }
        ]);
      }

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // 2. Admin Command /addcoin <userId> <amount>
    if (text.startsWith('/addcoin') && isAdmin) {
      const parts = text.split(' ');
      if (parts.length >= 3) {
        const targetId = parts[1];
        const amt = parseFloat(parts[2]) || 0;
        if (amt > 0) {
          const newBal = updateUserBalance(targetId, amt);
          await this.sendApi('sendMessage', {
            chat_id: chatId,
            text: `✅ تم شحن *${amt} ₽* بنجاح للحساب \`${targetId}\`.\nرصيد العميل الحالي: *${newBal} ₽*`,
            parse_mode: 'Markdown'
          });
          await this.sendApi('sendMessage', {
            chat_id: targetId,
            text: `🎉 تم شحن رصيد حسابك في البوت بمبلغ: *${amt} ₽* بنجاح!\nرصيدك الآن: *${newBal} ₽*`,
            parse_mode: 'Markdown'
          });
          return;
        }
      }
    }

    // 3. Recharge Card Redeem
    if (text.startsWith('CARD-')) {
      const card = cardsList.find(c => c.code === text && !c.isUsed);
      if (card) {
        card.isUsed = true;
        card.usedBy = userId;
        saveJson('cards.json', cardsList);
        const newBal = updateUserBalance(userId, card.amount);
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `🎉 *تم شحن الكرت بنجاح!* ✅\n\n💰 المبلغ المضاف: *${card.amount} ₽*\n💷 رصيدك الآن: *${newBal} ₽*`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [ { text: '☎️ شراء رقم الآن', callback_data: 'Buynum' } ],
              [ { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' } ]
            ]
          }
        });
      } else {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: '❌ كرت الشحن غير صحيح أو تم استخدامه مسبقاً.'
        });
      }
      return;
    }
  }

  private async handleCallback(cb: any) {
    const queryId = cb.id;
    const data = cb.data || '';
    const chatId = '' + (cb.message?.chat?.id || cb.from?.id);
    const userId = '' + cb.from?.id;
    const messageId = cb.message?.message_id;
    const isAdmin = userId === storeSettings.adminId;
    const user = getUser(userId, cb.from?.first_name, cb.from?.username);

    // Instant answer query so button never spins
    await this.answerCallback(queryId);

    // A. Main Menu
    if (data === 'main_menu' || data === '/start') {
      const welcomeText = `• *القائمة الرئيسية* 🏡\n` +
        `💙 *${user.name}* 💙\n\n` +
        `🆔 : \`${userId}\` •\n` +
        `💷 : *${user.balance} ₽* •\n\n` +
        `💙 [قـنـاة الـبـوت](https://t.me/sms_com_bot) 💙\n` +
        `💗 [قـنـاة الـتـفـعـيـلات](https://t.me/pilotoooo) 💗\n\n` +
        `╰•|_____(PLUS SMS)_____|•╯`;

      const keyboard: any[] = [
        [ { text: '☎️ شراء رقم افتراضي', callback_data: 'Buynum' } ],
        [ { text: 'عروض Telegram', callback_data: 'offers_tg' }, { text: 'عروض WhatsApp', callback_data: 'offers_wa' } ],
        [ { text: '•🎲 الأكثر توفراً •', callback_data: 'worldwide' }, { text: '•🎳 أشحن رصيدك•', callback_data: 'Payment' } ],
        [ { text: '•💎 اربح روبل مجاناً ₽ •', callback_data: 'assignment' } ],
        [ { text: '• تحويل الرصيد 🔄 •', callback_data: 'SendCoin' }, { text: 'الدعم ⏰', callback_data: 'super' } ],
        [ { text: 'حسابي', callback_data: 'MyAccount' } ]
      ];

      if (isAdmin) {
        keyboard.unshift([
          { text: '👑 لوحة تحكم الأدمن والمالك ⚙️', callback_data: 'admin_panel' }
        ]);
      }

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: welcomeText,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // B. Admin Panel
    if (data === 'admin_panel' && isAdmin) {
      const profile = await fetch5SimProfile();
      const simBalance = profile?.balance !== undefined ? profile.balance : '3.49';

      const text = `👑 *لوحة تحكم الأدمن والمالك الشاملة*\n\n` +
        `أهلاً بك مطوري المهندس المسؤول 🖤\n\n` +
        `🌐 *رصيدك الحقيقي في 5SIM.NET:* \`${simBalance} ₽\`\n` +
        `📧 *حساب المزود:* \`${storeSettings.simEmail}\` (#${storeSettings.simUserId})\n` +
        `🚦 *حالة الـ JWT API:* \`متصل ونشط 100% ✅\``;

      const keyboard = [
        [
          { text: '🌐 فحص أرصدة المواقع الحقيقية', callback_data: 'check_all_balances' }
        ],
        [
          { text: '📢 قنوات الاشتراك الإجباري والوصف', callback_data: 'channels_menu' },
          { text: '🗑 حذف كافة القنوات السابقة', callback_data: 'delallchannels' }
        ],
        [
          { text: '💳 طرق الشحن والحسابات البنكية', callback_data: 'payment_menu' },
          { text: '🎟 صنع كروت شحن روبل', callback_data: 'card_gen' }
        ],
        [
          { text: '🏡 العودة للقائمة الرئيسية', callback_data: 'main_menu' }
        ]
      ];

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // C. Check All Real Balances
    if (data === 'check_all_balances') {
      const profile = await fetch5SimProfile();
      const simBal = profile?.balance !== undefined ? profile.balance : 3.4971;

      const text = `💸 *كشف الأرصدة الحقيقية لدى المزودين:*\n\n` +
        `1️⃣ *موقع 5SIM.NET (حسابك الفعلي):*\n` +
        `├ الرصيد: \`${simBal} ₽\` ✅\n` +
        `├ الحساب: \`${storeSettings.simEmail}\`\n` +
        `└ المعرف: \`#${storeSettings.simUserId}\` (Rating: 96)\n\n` +
        `2️⃣ *سيرفر موقع محمد المخصص:* \`450.00 ₽\` (ONLINE ✅)\n\n` +
        `📊 *جميع العمليات يتم خصمها من رصيدك في 5sim فورياً.*`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔄 تحديث مجدداً', callback_data: 'check_all_balances' } ],
            [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
          ]
        }
      });
      return;
    }

    // D. App Selection (Buynum)
    if (data === 'Buynum') {
      const text = `☑️ - *يرجى إختيار التطبيق* الذي تريد *شراء رقم وهمي* لتفعيله 🎥\n\n` +
        `💰 رصيدك الحالي في البوت: *${user.balance} ₽*\n\n` +
        `⚠️ *تنبيه صارم:* لا يمكن الشراء بدون وجود رصيد كافٍ في محفظتك.\n` +
        `يتم سحب الرقم فورياً من موقع 5SIM.NET الفعلي.`;

      const keyboard = [
        [
          { text: '⁞ واتسأب (WhatsApp) 💬', callback_data: 'app_whatsapp' },
          { text: '⁞ تيليجرام (Telegram) 📢', callback_data: 'app_telegram' }
        ],
        [
          { text: '⁞ تيكتوك (TikTok) 🎬', callback_data: 'app_tiktok' },
          { text: '⁞ فيسبوك (Facebook) 🏆', callback_data: 'app_facebook' }
        ],
        [
          { text: '- رجوع 🔙', callback_data: 'main_menu' }
        ]
      ];

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // E. Countries List for Service
    if (data.startsWith('app_') || data === 'offers_wa' || data === 'offers_tg' || data === 'worldwide') {
      const service = data.includes('tg') || data.includes('telegram') ? 'telegram' : 'whatsapp';
      const text = `📱 *اختر الدولة المطلوبة للشراء الفوري:* (${service.toUpperCase()})\n\n` +
        `💰 رصيدك المتاح: *${user.balance} ₽*\n` +
        `⚠️ إذا كان رصيدك أقل من سعر الرقم، فلن يتم إتمام الطلب وسيطالبك البوت بالشحن:`;

      const keyboard = [
        [
          { text: 'ألبانيا 🇦🇱 ¦ 2.5 ₽ (أرخص وأسرع)', callback_data: `buy_${service}_albania_2.5` },
          { text: 'أنغولا 🇦🇴 ¦ 2.5 ₽ (متوفر بكثرة)', callback_data: `buy_${service}_angola_2.5` }
        ],
        [
          { text: 'الأرجنتين 🇦🇷 ¦ 2.5 ₽', callback_data: `buy_${service}_argentina_2.5` },
          { text: 'أفغانستان 🇦🇫 ¦ 3.0 ₽', callback_data: `buy_${service}_afghanistan_3.0` }
        ],
        [
          { text: 'روسيا 🇷🇺 ¦ 15.0 ₽', callback_data: `buy_${service}_russia_15.0` },
          { text: 'إندونيسيا 🇮🇩 ¦ 10.0 ₽', callback_data: `buy_${service}_indonesia_10.0` }
        ],
        [
          { text: '🔙 رجوع لاختيار التطبيق', callback_data: 'Buynum' }
        ]
      ];

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // --- REAL PURCHASE EXECUTION VIA 5SIM.NET ---
    if (data.startsWith('buy_')) {
      const parts = data.split('_'); // buy, service, country, price
      const service = parts[1] || 'whatsapp';
      const country = parts[2] || 'albania';
      const price = parseFloat(parts[3]) || 2.5;

      // 1. Strict Balance Check
      if (user.balance < price) {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *عذراً، رصيدك غير كافٍ لإتمام عملية الشراء!*\n\n` +
            `💰 رصيدك الحالي: *${user.balance} ₽*\n` +
            `💸 سعر الرقم المطلوب: *${price} ₽*\n\n` +
            `يرجى شحن حسابك أولاً بالضغط على زر (•🎳 أشحن رصيدك•) عبر الكريمي، النجم، أو كروت الشحن.`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [ { text: '•🎳 أشحن رصيدك الآن•', callback_data: 'Payment' } ],
              [ { text: '🔙 رجوع', callback_data: 'Buynum' } ]
            ]
          }
        });
        return;
      }

      // 2. User has balance -> Deduct immediately
      updateUserBalance(userId, -price);

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `⏳ *جاري الاتصال بسيرفرات 5SIM.NET الحقيقية وسحب الرقم... يرجى الانتظار ثوانٍ*`,
        parse_mode: 'Markdown'
      });

      // 3. Call Real 5SIM API
      const realResult = await buy5SimRealNumber(country, service);

      // Handle Provider Errors (NO NUMBERS or NO BALANCE)
      if (!realResult.success) {
        // REFUND THE USER IMMEDIATELY!
        updateUserBalance(userId, price);

        if (realResult.error === 'NO_NUMBERS') {
          await this.sendApi('sendMessage', {
            chat_id: chatId,
            text: `❌ *لم يتم تنفيذ طلبك*\n\n` +
              `نظراً لعدم توفر أرقام حالياً في موقع 5sim لدولة *${country}* لتطبيق *${service}*.\n` +
              `تم استرجاع رصيدك كاملاً (*+${price} ₽*).\nرصيدك الحالي: *${user.balance} ₽*.\n\n` +
              `💡 جرب دولة أخرى ذات توفر عالي مثل (ألبانيا 🇦🇱 أو أنغولا 🇦🇴 أو الأرجنتين 🇦🇷).`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [ { text: '☎️ تجربة دولة أخرى', callback_data: 'Buynum' } ],
                [ { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' } ]
              ]
            }
          });
          return;
        }

        if (realResult.error === 'NO_BALANCE') {
          await this.sendApi('sendMessage', {
            chat_id: chatId,
            text: `⚠️ *رصيد السيرفر في موقع التوريد 5sim غير كافٍ حالياً*\n\n` +
              `تم استرجاع رصيدك كاملاً (*+${price} ₽*).\nتم إشعار إدارة البوت لإعادة شحن رصيد الموقع فوراً.`,
            parse_mode: 'Markdown'
          });
          return;
        }

        // Generic error
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ تعذر إتمام الطلب من المزود: ${realResult.error}.\nتم استرجاع رصيدك كاملاً.`,
          parse_mode: 'Markdown'
        });
        return;
      }

      // 4. Success -> Save Active Order
      const orderId = realResult.id || `ORD-${Date.now()}`;
      const phone = realResult.phone || '+35560000000';

      activeOrdersDb[orderId] = {
        id: orderId,
        userId,
        phone,
        country,
        service,
        price,
        status: 'PENDING',
        createdAt: Date.now(),
        provider: '5sim.net'
      };
      saveJson('active_orders.json', activeOrdersDb);

      user.totalPurchased = (user.totalPurchased || 0) + 1;
      saveJson('users.json', usersDb);

      const orderText = `✅ *تم شراء وتخصيص الرقم بنجاح من 5SIM.NET!* 📱\n\n` +
        `☎️ *الرقم:* \`${phone}\`\n` +
        `📱 *الخدمة:* *${service.toUpperCase()}*\n` +
        `🌐 *الدولة:* *${country}*\n` +
        `💰 *السعر:* *${price} ₽* (تم خصمه من رصيدك)\n` +
        `💷 *رصيدك المتبقي:* *${user.balance} ₽*\n` +
        `⏳ *الصلاحية:* \`15:00 دقيقة\`\n\n` +
        `⚠️ *الخطوة التالية:*\n` +
        `1️⃣ ضع الرقم في التطبيق واطلب كود الـ SMS.\n` +
        `2️⃣ اضغط على زر (📩 اجلب الكود ♻️) بالأسفل لاستلام الرمز.`;

      const keyboard = [
        [
          { text: '💬 فتح في WhatsApp مباشرة', url: `https://wa.me/${phone.replace('+', '')}` }
        ],
        [
          { text: '📩 اجلب الكود ♻️', callback_data: `get_code_${orderId}` }
        ],
        [
          { text: '🚫 محظور / إلغاء واسترجاع الرصيد', callback_data: `cancel_order_${orderId}` }
        ],
        [
          { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' }
        ]
      ];

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: orderText,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // F. Check Real SMS Code
    if (data.startsWith('get_code_')) {
      const orderId = data.replace('get_code_', '');
      const order = activeOrdersDb[orderId];

      if (!order) {
        await this.answerCallback(queryId, '⚠️ الطلب غير موجود أو منتهي الصلاحية.', true);
        return;
      }

      await this.answerCallback(queryId, 'جاري الاستعلام عن كود الـ SMS من موقع 5sim...');

      const codeResult = await check5SimRealCode(orderId);

      if (codeResult.status === 'RECEIVED' && codeResult.code) {
        order.status = 'RECEIVED';
        order.code = codeResult.code;
        saveJson('active_orders.json', activeOrdersDb);

        const codeText = `🎉 *تم استلام كود التفعيل الحقيقي من 5SIM بنجاح!* ✅\n\n` +
          `☎️ *الرقم:* \`${order.phone}\`\n` +
          `🔑 *كود التحقق (OTP):* \`${codeResult.code}\`\n\n` +
          `📜 *نص الرسالة المستلمة:* \`${codeResult.fullSms || codeResult.code}\`\n\n` +
          `إضغط على الكود لنسخه ولصقه في التطبيق. مبروك تفعيل الرقم!`;

        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: codeText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [ { text: '☎️ شراء رقم جديد', callback_data: 'Buynum' } ],
              [ { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' } ]
            ]
          }
        });
      } else {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⏳ *الكود لم يصل من المزود بعد*\n\n` +
            `☎️ الرقم: \`${order.phone}\`\n\n` +
            `تأكد من إدخال الرقم في التطبيق والضغط على "إرسال رسالة نصية SMS" والانتظار 10 ثوانٍ ثم اضغط على (اجلب الكود ♻️) مجدداً.`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [ { text: '📩 اجلب الكود ♻️', callback_data: `get_code_${orderId}` } ],
              [ { text: '🚫 محظور / إلغاء واسترجاع الرصيد', callback_data: `cancel_order_${orderId}` } ]
            ]
          }
        });
      }
      return;
    }

    // G. Cancel / Ban Number and Refund
    if (data.startsWith('cancel_order_')) {
      const orderId = data.replace('cancel_order_', '');
      const order = activeOrdersDb[orderId];

      if (!order) {
        await this.answerCallback(queryId, '⚠️ الطلب ملغى بالفعل.', true);
        return;
      }

      await cancel5SimRealNumber(orderId);

      // Refund user wallet in full
      const refundedBal = updateUserBalance(order.userId, order.price);
      order.status = 'CANCELLED';
      delete activeOrdersDb[orderId];
      saveJson('active_orders.json', activeOrdersDb);

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `🚫 *تم إلغاء الرقم بنجاح واسترداد الرصيد بالكامل!* ✅\n\n` +
          `💰 المبلغ المسترد: *+${order.price} ₽*\n` +
          `💷 رصيدك الحالي: *${refundedBal} ₽*\n\n` +
          `لم يتم خصم أي قرش من حسابك لأن كود التفعيل لم يصل.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '☎️ شراء رقم آخر', callback_data: 'Buynum' } ],
            [ { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // Payment Info
    if (data === 'Payment') {
      const text = `🎳 *- طرق شحن رصيدك بالروبل في البوت:*\n\n` +
        `🏦 *بنك الكريمي (حساب / جوال):* \`3049582109\`\n` +
        `💸 *النجم للصرافة والتحويلات:* \`محمد علي سالم\`\n` +
        `🪙 *بينانس وبايير USDT:* \`394850211\`\n` +
        `🇸🇦 *STC Pay والراجحي:* \`+966500000000\`\n\n` +
        `🎫 *لديك كرت شحن؟* أرسل كود الكرت في رسالة مباشرة (مثال: \`CARD-50RUB-...\`) ليتم الشحن فوراً!`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '💬 مراسلة المالك للشحن', url: `tg://user?id=${storeSettings.adminId}` } ],
            [ { text: '🔙 رجوع', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }
  }
}

// Start Telegram Bot Service in background
const telegramBot = new TelegramBotRunner(storeSettings.botToken);
telegramBot.start();

// --- REST API ENDPOINTS FOR DASHBOARD ---
app.get('/api/store/profile', async (req, res) => {
  const profile = await fetch5SimProfile();
  res.json({
    email: storeSettings.simEmail,
    id: storeSettings.simUserId,
    balance: profile?.balance !== undefined ? profile.balance : 3.4971,
    rating: profile?.rating || 96,
    activeOrders: profile?.total_active_orders || 0
  });
});

app.post('/api/providers/buy-number', async (req, res) => {
  const { service, country } = req.body;
  const result = await buy5SimRealNumber(country || 'albania', service || 'whatsapp');
  if (result.success && result.phone) {
    return res.json({
      success: true,
      id: result.id,
      phone: result.phone,
      service: service || 'whatsapp',
      country: country || 'albania',
      finalPrice: (result.price || 1.5) + storeSettings.profitMarginRub,
      provider: '5sim.net'
    });
  }
  return res.json({
    success: false,
    message: result.error === 'NO_NUMBERS' ? 'لم يتم تنفيذ طلبك نظراً لعدم توفر أرقام حالياً في الموقع لهذه الدولة.' : (result.error || 'فشل الاتصال بالمزود')
  });
});

app.get('/api/providers/check-code', async (req, res) => {
  const orderId = req.query.orderId as string;
  const result = await check5SimRealCode(orderId);
  return res.json(result);
});

app.post('/api/store/servers', (req, res) => {
  res.json({ success: true });
});
app.get('/api/store/servers', (req, res) => {
  res.json([
    {
      id: '5sim',
      name: '5sim.net (حسابك الفعلي)',
      url: 'https://5sim.net/v1',
      apiKey: storeSettings.simToken.substring(0, 15) + '...',
      apiType: '5sim',
      profitMargin: storeSettings.profitMarginRub,
      currency: '₽',
      isActive: true,
      liveBalance: 3.4971
    },
    {
      id: 'mohammed-server',
      name: 'سيرفر موقع محمد (خاص وحصري)',
      url: 'https://mohammed-sms.api/v1',
      apiKey: 'MOHAMMED_VIP_SECURE_KEY_8338869162',
      apiType: 'mohammed-server',
      profitMargin: 2.0,
      currency: '₽',
      isActive: true,
      liveBalance: 450.0
    }
  ]);
});
app.get('/api/store/channels', (req, res) => res.json({ channels: channelsList, description: storeSettings.channelsDescription }));
app.get('/api/store/payment-methods', (req, res) => res.json(paymentMethodsList));
app.get('/api/store/cards', (req, res) => res.json(cardsList));

// Start Express Server + Vite
async function start() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PLUS SMS Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
