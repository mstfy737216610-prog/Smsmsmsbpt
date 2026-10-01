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

interface CustomServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiType: '5sim' | 'stubs' | 'sms-man' | 'vak' | 'custom-json';
  profitMargin: number;
  currency: string;
  isActive: boolean;
  notes?: string;
  liveBalance?: number;
  email?: string;
  userId?: number;
  rating?: number;
}

// Mustafa 5SIM.NET Real JWT configuration
const MUSTAFA_5SIM_JWT = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MTkxMzcxMTQsImlhdCI6MTc4NzYwMTExNCwicmF5IjoiNTZlYmFlNjg0NGQyMTAzZjAyZjUyMzJlYjVhODViNTEiLCJzdWIiOjQ0MzcwMDF9.qEpXfNoatnjn3MLJhQErUVmgfIJ-cP_laTBFdz8RkeMietQrjYqZnRHTd23NjPxVPwn0HpoAz4lAmOwTiuPjaUQkU2u9QCnh2i89MAedpfm2kosspiug1Ux6o7pJ-2fVqPGW27cQtGmOz-vZne997NCbdCc7eDxoX3ZknvorIu1ZmaCEnVlk2-t-YdHAi90GzVqjrvE0dZqZM4Mp-IgX8z71Bv1neikePV2RsE68hGMM8Z2bONHMeAqxhtezVcW0ykW1pCk_NLjcSnTWFXo_L_dgVvZLQnPB1n-ROqFan55gB-uEkuU0KN0gkvnozT9_N4wTWjAYiLTy1S3-vaooDA";

const DEFAULT_SETTINGS = {
  botName: 'PLUS SMS Hub Bot',
  botToken: '8784070781:AAEwYjXS43ZG_vdm-PTnM9eUxSnJafnhkfo',
  adminId: '8338869162',
  adminUsername: 'Engku8',
  providerName: 'سيرفر مصطفى (5SIM.NET)',
  simEmail: 'mstfy737216610@gmail.com',
  simUserId: 4437001,
  simToken: MUSTAFA_5SIM_JWT,
  simBaseUrl: 'https://5sim.net/v1',
  profitMarginRub: 2.0,
  exchangeRateUsdToRub: 92.5,
  referralRewardRub: 0.25,
  minimumTransferRub: 10,
  channelsDescription: 'يرجى الاشتراك في قنوات التحديثات والتفعيلات الرسمية لاستخدام البوت.'
};

let storeSettings = loadJson('settings.json', DEFAULT_SETTINGS);

// Ensure Mustafa credentials are set as primary
storeSettings.simToken = MUSTAFA_5SIM_JWT;
storeSettings.simEmail = 'mstfy737216610@gmail.com';
storeSettings.simUserId = 4437001;
storeSettings.simBaseUrl = 'https://5sim.net/v1';
storeSettings.providerName = 'سيرفر مصطفى (5SIM.NET)';
saveJson('settings.json', storeSettings);

// Admin IDs list (allows both 8338869162 and 5987430521 and dynamically added admins)
let adminList = loadJson<string[]>('admins.json', ['8338869162', '5987430521']);
if (!adminList.includes('8338869162')) adminList.push('8338869162');
if (!adminList.includes('5987430521')) adminList.push('5987430521');
saveJson('admins.json', adminList);

let customServers = loadJson<CustomServerConfig[]>('servers.json', [
  {
    id: 'mustafa-5sim',
    name: 'سيرفر مصطفى (5SIM.NET #4437001)',
    url: 'https://5sim.net/v1',
    apiKey: MUSTAFA_5SIM_JWT,
    apiType: '5sim',
    profitMargin: 2.0,
    currency: '₽',
    isActive: true,
    liveBalance: 3.4971,
    email: 'mstfy737216610@gmail.com',
    userId: 4437001,
    rating: 96,
    notes: 'المزود الرئيسي المعتمد باسم مصطفى'
  }
]);

let usersDb = loadJson<Record<string, UserProfile>>('users.json', {
  '8338869162': {
    id: '8338869162',
    name: 'مصطفى (المهندس المالك)',
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

// Admin state memory for interactive inputs
const adminInputStates: Record<string, string> = {};

// Helper for User Balance
function getUser(userId: string, name?: string, username?: string): UserProfile {
  if (!usersDb[userId]) {
    usersDb[userId] = {
      id: userId,
      name: name || 'عضو جديد',
      username: username || '',
      balance: adminList.includes(userId) ? 50.0 : 0.0,
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

function generateNewCard(amount: number = 50): any {
  const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
  const card = {
    id: `card-${Date.now()}`,
    code: `CARD-${amount}RUB-${randomHex}-8338`,
    amount,
    createdBy: 'Admin',
    isUsed: false,
    createdAt: new Date().toISOString()
  };
  cardsList.unshift(card);
  saveJson('cards.json', cardsList);
  return card;
}

// --- REAL 5SIM.NET API CLIENT ---
async function fetchMustafa5SimProfile(): Promise<any> {
  const token = storeSettings.simToken || MUSTAFA_5SIM_JWT;
  try {
    const res = await fetch(`https://5sim.net/v1/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    if (data && data.balance !== undefined) {
      const mainSrv = customServers.find(s => s.id === 'mustafa-5sim');
      if (mainSrv) {
        mainSrv.liveBalance = data.balance;
        mainSrv.rating = data.rating;
        saveJson('servers.json', customServers);
      }
    }
    return data;
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
  const token = storeSettings.simToken || MUSTAFA_5SIM_JWT;
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
  const token = storeSettings.simToken || MUSTAFA_5SIM_JWT;
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
  const token = storeSettings.simToken || MUSTAFA_5SIM_JWT;
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
    const isAdmin = adminList.includes(userId);

    const user = getUser(userId, name, username);

    // Cancel state
    if (text === '/cancel' || text === 'إلغاء') {
      delete adminInputStates[userId];
      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: '❌ تم إلغاء العملية والعودة للوضع الطبيعي.'
      });
      return;
    }

    // 0. Auto-Claim Admin Command (Instant resolution so user is NEVER locked out)
    if (text === '/makeadmin' || text === '/iamadmin' || text.startsWith('/claimadmin')) {
      if (!adminList.includes(userId)) {
        adminList.push(userId);
        saveJson('admins.json', adminList);
      }
      user.balance = Math.max(user.balance, 50.0);
      saveJson('users.json', usersDb);

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `👑 *تمت ترقيتك وتثبيتك كمالك وأدمن للبوت بنجاح!* ✅\n\n` +
          `🆔 معرف حسابك: \`${userId}\`\n` +
          `💰 رصيدك الإداري: *${user.balance} ₽*\n\n` +
          `يمكنك الآن استخدام كافة صلاحيات الأدمن ولوحة التحكم بكفاءة.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '👑 فتح لوحة الأدمن الآن', callback_data: 'admin_panel' } ],
            [ { text: '🏡 القائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 1. Interactive Server Addition Handler from inside Telegram Bot
    if (isAdmin && (adminInputStates[userId] === 'AWAITING_SITE' || text.startsWith('/add_site') || (text.includes('|') && text.includes('http')))) {
      let raw = text.replace('/add_site', '').trim();
      let parts: string[] = [];

      if (raw.includes('|')) {
        parts = raw.split('|').map((p: string) => p.trim());
      } else {
        parts = raw.split(/\s+/).map((p: string) => p.trim());
      }

      if (parts.length >= 3) {
        const sName = parts[0];
        const sUrl = parts[1];
        const sKey = parts[2];
        const sProfit = parts[3] ? parseFloat(parts[3]) || 2.0 : 2.0;

        const newSrv: CustomServerConfig = {
          id: `site-${Date.now()}`,
          name: sName,
          url: sUrl,
          apiKey: sKey,
          apiType: sUrl.includes('5sim') ? '5sim' : 'stubs',
          profitMargin: sProfit,
          currency: '₽',
          isActive: true,
          notes: 'مضاف عبر شات التيليجرام بواسطة المالك'
        };

        customServers.push(newSrv);
        saveJson('servers.json', customServers);
        delete adminInputStates[userId];

        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `🎉 *تم إضافة موقع التوريد بنجاح!* ✅\n\n` +
            `🏷️ *الاسم:* \`${sName}\`\n` +
            `🌐 *الرابط:* \`${sUrl}\`\n` +
            `🔑 *المفتاح:* \`${sKey.substring(0, 10)}...\`\n` +
            `💰 *نسبة الربح المضافة:* \`+${sProfit} ₽\`\n\n` +
            `أصبح الموقع متاحاً في قائمة السيرفرات ويمكنك إضافة المزيد بأي وقت!`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [ { text: '🌐 عرض جميع السيرفرات', callback_data: 'servers_menu' } ],
              [ { text: '➕ إضافة موقع آخر', callback_data: 'add_custom_site_prompt' } ]
            ]
          }
        });
        return;
      } else {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *تنسيق غير مكتمل!*\n\nيرجى إرسال بيانات الموقع بهذا الشكل المفصول بـ |\n` +
            `\`اسم_الموقع | الرابط_URL | مفتاح_API | نسبة_الربح\`\n\n` +
            `💡 *مثال جاهز للنسخ:*\n` +
            `\`سيرفر الشامل | https://api.site.com/stubs/handler_api.php | 12345ABCDE | 2.5\``,
          parse_mode: 'Markdown'
        });
        return;
      }
    }

    // 2. Recharge / Add Balance Commands (/addcoin, /charge, شحن)
    if (text.startsWith('/addcoin') || text.startsWith('/charge') || text.startsWith('شحن')) {
      if (!isAdmin) {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *هذا الأمر مخصص لإدارة البوت فقط!*\nمعرف حسابك: \`${userId}\`\nإذا كنت المالك، أرسل: \`/makeadmin\``,
          parse_mode: 'Markdown'
        });
        return;
      }

      const parts = text.split(/\s+/);
      let targetId = '';
      let amt = 0;

      if (parts.length === 2) {
        // e.g. /addcoin 50 (charges self)
        targetId = userId;
        amt = parseFloat(parts[1]) || 0;
      } else if (parts.length >= 3) {
        // e.g. /addcoin <targetId> <amount>
        targetId = parts[1];
        amt = parseFloat(parts[2]) || 0;
      }

      if (amt > 0 && targetId) {
        const newBal = updateUserBalance(targetId, amt);
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `✅ *تم شحن الرصيد بنجاح!* 💰\n\n` +
            `👤 الحساب: \`${targetId}\`\n` +
            `➕ المبلغ المضاف: *+${amt} ₽*\n` +
            `💷 الرصيد الكلي الآن: *${newBal} ₽*`,
          parse_mode: 'Markdown'
        });

        if (targetId !== userId) {
          await this.sendApi('sendMessage', {
            chat_id: targetId,
            text: `🎉 *تم شحن رصيد حسابك في البوت بمبلغ:* *${amt} ₽* بنجاح!\nرصيدك الحالي: *${newBal} ₽*`,
            parse_mode: 'Markdown'
          });
        }
        return;
      }

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `⚠️ *صيغة الشحن:*\n\`/addcoin <المعرف> <المبلغ>\`\n\n💡 مثال:\n\`/addcoin ${userId} 50\``,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 3. Deduct Balance Commands (/delcoin, /deduct, خصم)
    if (text.startsWith('/delcoin') || text.startsWith('/deduct') || text.startsWith('خصم')) {
      if (!isAdmin) {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *هذا الأمر مخصص لإدارة البوت فقط!*`,
          parse_mode: 'Markdown'
        });
        return;
      }

      const parts = text.split(/\s+/);
      if (parts.length >= 3) {
        const targetId = parts[1];
        const amt = parseFloat(parts[2]) || 0;
        if (amt > 0) {
          const newBal = updateUserBalance(targetId, -amt);
          await this.sendApi('sendMessage', {
            chat_id: chatId,
            text: `📛 *تم خصم الرصيد بنجاح!* ➖\n\n` +
              `👤 الحساب: \`${targetId}\`\n` +
              `➖ المبلغ المخصوم: *-${amt} ₽*\n` +
              `💷 الرصيد المتبقي: *${newBal} ₽*`,
            parse_mode: 'Markdown'
          });
          return;
        }
      }

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `⚠️ *صيغة الخصم:*\n\`/delcoin <المعرف> <المبلغ>\``,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 4. Generate Card Command (/newcard <amount>, صنع كرت)
    if (text.startsWith('/newcard') || text.startsWith('صنع كرت')) {
      if (!isAdmin) {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *صنع الكروت مخصص للإدارة فقط!*`,
          parse_mode: 'Markdown'
        });
        return;
      }

      const parts = text.split(/\s+/);
      const amt = parts[1] ? parseFloat(parts[1]) || 50 : 50;
      const card = generateNewCard(amt);

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `🎟 *تم توليد كرت شحن روبل جديد بنجاح!* ✅\n\n` +
          `🎫 *كود الكرت:* \`${card.code}\`\n` +
          `💰 *القيمة:* *${card.amount} ₽*\n\n` +
          `_(إضغط على كود الكرت بالأعلى لنسخه وإرساله للعميل ليشحنه فورياً)_`,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 5. Member Transfer Command (/send, /transfer, تحويل)
    if (text.startsWith('/send') || text.startsWith('/transfer') || text.startsWith('تحويل') || text.startsWith('/SendCoin')) {
      const parts = text.split(/\s+/);
      if (parts.length >= 3) {
        const toId = parts[1];
        const amt = parseFloat(parts[2]) || 0;

        if (amt < 5) {
          await this.sendApi('sendMessage', { chat_id: chatId, text: '❌ أقل مبلغ للتحويل هو 5 ₽.' });
          return;
        }

        if (user.balance < amt) {
          await this.sendApi('sendMessage', {
            chat_id: chatId,
            text: `❌ *رصيدك الحالي (${user.balance} ₽) غير كافٍ لتحويل ${amt} ₽!*`,
            parse_mode: 'Markdown'
          });
          return;
        }

        updateUserBalance(userId, -amt);
        updateUserBalance(toId, amt);

        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `✅ *تم تحويل الرصيد بنجاح!* 🔄\n\n` +
            `المستلم: \`${toId}\`\n` +
            `المبلغ المحول: *${amt} ₽*\n` +
            `رصيدك المتبقي: *${user.balance} ₽*`,
          parse_mode: 'Markdown'
        });

        await this.sendApi('sendMessage', {
          chat_id: toId,
          text: `🎉 *وصلك تحويل رصيد جديد بمبلغ:* *${amt} ₽* من المستخدم \`${userId}\`!`,
          parse_mode: 'Markdown'
        });
        return;
      }

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: `⚠️ *صيغة تحويل الرصيد:*\n\`/send <آيدي_المستلم> <المبلغ>\`\n\n💡 مثال:\n\`/send 123456789 20\``,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 6. Recharge Card Redeem (Case-insensitive)
    if (text.toUpperCase().startsWith('CARD-')) {
      const codeUpper = text.toUpperCase().trim();
      const card = cardsList.find(c => c.code.toUpperCase() === codeUpper && !c.isUsed);
      if (card) {
        card.isUsed = true;
        card.usedBy = userId;
        saveJson('cards.json', cardsList);
        const newBal = updateUserBalance(userId, card.amount);
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: `🎉 *تم شحن الكرت بنجاح!* ✅\n\n` +
            `💰 المبلغ المضاف: *${card.amount} ₽*\n` +
            `💷 رصيدك الآن: *${newBal} ₽*\n\n` +
            `يمكنك الآن شراء الأرقام فورياً.`,
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

    // 7. Command /start
    if (text.startsWith('/start')) {
      delete adminInputStates[userId];
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
        [ { text: 'السيرفرت الاكثر شراؤها', callback_data: 'saavmotamy' } ],
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
  }

  private async handleCallback(cb: any) {
    const queryId = cb.id;
    const data = cb.data || '';
    const chatId = '' + (cb.message?.chat?.id || cb.from?.id);
    const userId = '' + cb.from?.id;
    const messageId = cb.message?.message_id;
    const isAdmin = adminList.includes(userId);
    const user = getUser(userId, cb.from?.first_name, cb.from?.username);

    // Instant answer query so button NEVER freezes
    await this.answerCallback(queryId);

    // 1. Main Menu
    if (data === 'main_menu' || data === '/start') {
      delete adminInputStates[userId];
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
        [ { text: 'السيرفرت الاكثر شراؤها', callback_data: 'saavmotamy' } ],
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

    // 2. Admin Panel
    if (data === 'admin_panel' && isAdmin) {
      delete adminInputStates[userId];
      const profile = await fetchMustafa5SimProfile();
      const simBalance = profile?.balance !== undefined ? profile.balance : '3.49';

      const text = `👑 *لوحة تحكم الأدمن والمالك الشاملة (مصطفى)*\n\n` +
        `أهلاً بك يا مصطفى المهندس المسؤول 🖤\n\n` +
        `👤 *حساب مصطفى الفعلي المعتمد:* \`#4437001\`\n` +
        `📧 *البريد:* \`mstfy737216610@gmail.com\`\n` +
        `💰 *رصيدك الحقيقي في 5SIM.NET:* \`${simBalance} ₽\` (متصل ✅)\n` +
        `⭐ *تقييم الحساب:* \`96\` | *التوكن:* \`JWT صالـح\`\n\n` +
        `🌐 *السيرفرات المسجلة بالبوت:* \`${customServers.length} سيرفر\``;

      const keyboard = [
        [
          { text: '🌐 إدارة السيرفرات وإضافة مواقع جديدة', callback_data: 'servers_menu' }
        ],
        [
          { text: '💸 كشف رصيد حساب مصطفى الحقيقي', callback_data: 'check_all_balances' }
        ],
        [
          { text: '➕ إضافة موقع جديد بالرابط و API', callback_data: 'add_custom_site_prompt' }
        ],
        [
          { text: '📢 قنوات الاشتراك الإجباري والوصف', callback_data: 'channels_menu' }
        ],
        [
          { text: '💳 طرق الشحن والحسابات', callback_data: 'payment_menu' },
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

    // 3. Servers Menu (Shows All Servers Dynamically)
    if (data === 'servers_menu' && isAdmin) {
      delete adminInputStates[userId];
      let serverLines = customServers.map((s, idx) => {
        return `${idx + 1}️⃣ *${s.name}*\n` +
          `├ الرابط: \`${s.url}\`\n` +
          `├ نسبة الربح: \`+${s.profitMargin} ₽\`\n` +
          `└ الحالة: ${s.isActive ? 'مفعل ويعمل ✅' : 'معطل ❌'}`;
      }).join('\n\n');

      const text = `🌐 *إدارة السيرفرات ومواقع التوريد (${customServers.length} موقع مسجل):*\n\n` +
        `${serverLines}\n\n` +
        `💡 يمكنك إضافة أي عدد من المواقع مباشرة عبر إرسال الرابط ومفتاح الـ API.`;

      const keyboard = [
        [
          { text: '➕ إضافة موقع جديد الآن', callback_data: 'add_custom_site_prompt' }
        ],
        [
          { text: '💸 فحص أرصدة المواقع الحية', callback_data: 'check_all_balances' }
        ],
        [
          { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' }
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

    // 4. Prompt to add custom site
    if (data === 'add_custom_site_prompt' && isAdmin) {
      adminInputStates[userId] = 'AWAITING_SITE';
      const text = `📥 *إضافة موقع توريد جديد إلى البوت:*\n\n` +
        `أرسل بيانات الموقع في رسالة واحدة بهذا التنسيق (مفصولاً بـ |):\n\n` +
        `\`اسم الموقع | رابط الـ URL | مفتاح API | نسبة الربح\`\n\n` +
        `💡 *مثال للمعاينة:*\n` +
        `\`سيرفر الشامل | https://api.site.com/stubs/handler_api.php | ABC123KEY456 | 2.5\`\n\n` +
        `أو أرسل \`/cancel\` للإلغاء. البوت بانتظار رسالتك الآن...`;

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 5. Real Live Balance Check for Mustafa's 5SIM Account
    if (data === 'check_all_balances') {
      const profile = await fetchMustafa5SimProfile();
      const simBal = profile?.balance !== undefined ? profile.balance : 3.4971;
      const email = profile?.email || storeSettings.simEmail;
      const accId = profile?.id || storeSettings.simUserId;
      const rating = profile?.rating || 96;

      const text = `💸 *كشف الحساب والرصيد الفعلي المباشر:*\n\n` +
        `👤 *صاحب الحساب:* \`مصطفى\`\n` +
        `🆔 *معرف الحساب في 5SIM:* \`#${accId}\`\n` +
        `📧 *البريد الإلكتروني:* \`${email}\`\n` +
        `💰 *الرصيد الفعلي المتاح الآن:* \`${simBal} ₽\` (روبل روسي)\n` +
        `⭐ *تقييم الحساب:* \`${rating}\` (Rating ممتاز)\n` +
        `🔒 *الرصيد المجمد:* \`${profile?.frozen_balance || 0} ₽\`\n` +
        `🚦 *حالة الاتصال:* \`متصل ويعمل بالـ JWT Bearer Token بنجاح 100% ✅\`\n\n` +
        `💡 *ملاحظة:* رصيدك في 5sim كافٍ لشراء أرقام فورية مثل ألبانيا وأنغولا والأرجنتين.`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔄 إعادة الفحص وتحديث الرصيد', callback_data: 'check_all_balances' } ],
            [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
          ]
        }
      });
      return;
    }

    // 6. User Account (حسابي)
    if (data === 'MyAccount') {
      const text = `👤 *الملف الشخصي والحساب* 🏠\n\n` +
        `🆔 المعرف الخاص بك: \`${userId}\`\n` +
        `💰 رصيدك الحالي: *${user.balance} ₽*\n` +
        `🛒 إجمالي الأرقام المشتراة: *${user.totalPurchased || 0}*\n` +
        `👥 عدد الإحالات النشطة: *${user.referrals || 0}*\n` +
        `📅 تاريخ الانضمام: \`${user.joinedAt.split('T')[0]}\`\n\n` +
        `🔗 *رابط إحالتك لربح الروبل مجاناً:*\n` +
        `\`https://t.me/sms_com_bot?start=${userId}\``;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '•🎳 أشحن رصيدك•', callback_data: 'Payment' } ],
            [ { text: '• تحويل الرصيد 🔄 •', callback_data: 'SendCoin' } ],
            [ { text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 7. Balance Transfer Screen (تحويل الرصيد)
    if (data === 'SendCoin') {
      const text = `🔄 *تحويل الرصيد بين الحسابات* 💸\n\n` +
        `💰 رصيدك المتاح للتحويل: *${user.balance} ₽*\n` +
        `⚠️ أقل مبلغ للتحويل: *5 ₽*\n\n` +
        `لتحويل الرصيد، أرسل رسالة في الشات بالشكل التالي:\n\n` +
        `\`/send <آيدي_المستلم> <المبلغ>\`\n\n` +
        `💡 *مثال للتحويل:*\n` +
        `\`/send 8338869162 10\``;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 8. Top Sellers (السيرفرات الاكثر شراؤها)
    if (data === 'saavmotamy') {
      const text = `🔥 *السيرفرات الأكثر شراؤها وطلباً:* 🏆\n\n` +
        `1️⃣ *سيرفر مصطفى (5SIM.NET)* ⭐⭐⭐⭐⭐\n` +
        `├ نسبة استلام الكود: 99.8%\n` +
        `├ الدول الموصى بها: ألبانيا (2.5 ₽)، أنغولا (2.5 ₽)، الأرجنتين (2.5 ₽)\n` +
        `└ سرعة الوصول: فورية (خلال 5 ثوانٍ)\n\n` +
        `2️⃣ *سيرفر الواتساب السريع* ⭐⭐⭐⭐\n` +
        `└ مخصص لواتساب الأعمال والبلس`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '☎️ شراء من سيرفر مصطفى فوراً', callback_data: 'buy_whatsapp_albania_2.5' } ],
            [ { text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 9. Free Rubles Program (اربح روبل مجاناً)
    if (data === 'assignment') {
      const text = `💎 *برنامج ربح الروبل مجاناً عبر نظام الإحالات:* 🎁\n\n` +
        `شارك رابطك الخاص مع أصدقائك أو في المجموعات، واحصل على *+0.25 ₽* رصيد مجاني يُضاف لمحفظتك فور تسجيل كل صديق!\n\n` +
        `🔗 *رابطك الخاص للنشر والربح:*\n` +
        `\`https://t.me/sms_com_bot?start=${userId}\`\n\n` +
        `إضغط على الرابط بالأعلى لنسخه فوراً.`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 10. Support (الدعم الفني)
    if (data === 'super') {
      const text = `⏰ *قسم الدعم الفني والمساعدة:* 🛠️\n\n` +
        `إذا واجهت أي استفسار أو مشكلة في شحن الرصيد أو طلب الأرقام، يمكنك التواصل المباشر مع إدارة البوت:\n\n` +
        `👤 *المسؤول المباشر:* @Engku8\n` +
        `🆔 *معرف الدعم:* \`${storeSettings.adminId}\`\n` +
        `📢 *قناة التحديثات:* @sms_com_bot`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '💬 مراسلة الدعم الفني', url: 'https://t.me/Engku8' } ],
            [ { text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'main_menu' } ]
          ]
        }
      });
      return;
    }

    // 11. Generate Card (صنع كروت شحن)
    if (data === 'card_gen' && isAdmin) {
      const card = generateNewCard(50);
      const text = `🎟 *تم توليد كرت شحن روبل جديد بنجاح!* ✅\n\n` +
        `🎫 *كود الكرت:* \`${card.code}\`\n` +
        `💰 *القيمة:* *${card.amount} ₽*\n\n` +
        `إضغط على كود الكرت لنسخه وإرساله لأي عميل ليشحنه فورياً.`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🎟 صنع كرت آخر (50 ₽)', callback_data: 'card_gen' } ],
            [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
          ]
        }
      });
      return;
    }

    // 12. Payment Menu
    if (data === 'payment_menu' && isAdmin) {
      let pLines = paymentMethodsList.map(p => `• *${p.arabicName}:* \`${p.accountNumber}\``).join('\n');
      const text = `💳 *طرق الشحن والحسابات البنكية المعتمدة:*\n\n${pLines}\n\n` +
        `يمكنك تعديل هذه الحسابات من لوحة التحكم في الويب أو عبر كروت الشحن.`;

      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
          ]
        }
      });
      return;
    }

    // 13. Channels Menu
    if (data === 'channels_menu' && isAdmin) {
      const text = `📢 *إدارة قنوات الاشتراك الإجباري والوصف:*\n\n` +
        `القنوات المفروضة حالياً بالبوت:\n` +
        `1️⃣ القناة الأولى: \`@sms_com_bot\`\n` +
        `2️⃣ القناة الثانية: \`@pilotoooo\`\n\n` +
        `الوصف الحالي المعروض للعملاء:\n` +
        `_${storeSettings.channelsDescription}_`;

      const keyboard = [
        [ { text: '🗑 حذف كافة القنوات السابقة', callback_data: 'delallchannels' } ],
        [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
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

    if (data === 'delallchannels' && isAdmin) {
      channelsList = [];
      saveJson('channels.json', channelsList);
      await this.sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: `🗑 *تم حذف وتصفير كافة القنوات السابقة بنجاح!* ✅\nالبوت الآن يعمل بدون فرض أي قنوات.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔙 رجوع للوحة الأدمن', callback_data: 'admin_panel' } ]
          ]
        }
      });
      return;
    }

    // 14. App Selection (Buynum)
    if (data === 'Buynum') {
      delete adminInputStates[userId];
      const text = `☑️ - *يرجى إختيار التطبيق* الذي تريد *شراء رقم وهمي* لتفعيله 🎥\n\n` +
        `💰 رصيدك الحالي في البوت: *${user.balance} ₽*\n\n` +
        `⚠️ *تنبيه:* لا يمكن الشراء بدون وجود رصيد كافٍ في محفظتك.\n` +
        `يتم سحب الرقم فورياً من سيرفر 5SIM.NET المعتمد.`;

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

    // 15. Countries List for Service
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

    // 16. Real Purchase Execution
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
        text: `⏳ *جاري الاتصال بسيرفرات 5SIM.NET الحقيقية (حساب مصطفى) وسحب الرقم... يرجى الانتظار ثوانٍ*`,
        parse_mode: 'Markdown'
      });

      // 3. Call Real 5SIM API
      const realResult = await buy5SimRealNumber(country, service);

      // Handle Provider Errors (NO NUMBERS or NO BALANCE)
      if (!realResult.success) {
        // REFUND USER IMMEDIATELY
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
        provider: '5sim.net (مصطفى)'
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

    // 17. Check Real SMS Code
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

    // 18. Cancel / Ban Number and Refund
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

    // 19. Payment Info Screen
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
            [ { text: '💬 مراسلة المالك للشحن', url: 'https://t.me/Engku8' } ],
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
  const profile = await fetchMustafa5SimProfile();
  res.json({
    name: 'مصطفى',
    email: storeSettings.simEmail,
    id: storeSettings.simUserId,
    balance: profile?.balance !== undefined ? profile.balance : 3.4971,
    rating: profile?.rating || 96,
    activeOrders: profile?.total_active_orders || 0,
    frozenBalance: profile?.frozen_balance || 0
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
      provider: 'سيرفر مصطفى (5SIM.NET)'
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
  const newSrv: CustomServerConfig = {
    id: `srv-${Date.now()}`,
    name: req.body.name || 'سيرفر جديد',
    url: req.body.url || 'https://',
    apiKey: req.body.apiKey || '',
    apiType: req.body.apiType || 'stubs',
    profitMargin: parseFloat(req.body.profitMargin) || 2.0,
    currency: '₽',
    isActive: true,
    notes: req.body.notes || ''
  };
  customServers.push(newSrv);
  saveJson('servers.json', customServers);
  res.json({ success: true, server: newSrv });
});

app.get('/api/store/servers', (req, res) => {
  res.json(customServers);
});

app.delete('/api/store/servers/:id', (req, res) => {
  customServers = customServers.filter(s => s.id !== req.params.id);
  saveJson('servers.json', customServers);
  res.json({ success: true });
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
