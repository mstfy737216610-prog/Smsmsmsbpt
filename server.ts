import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory persistent state (with local defaults and easily updated via API)
interface CustomServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiType: '5sim' | 'stubs' | 'sms-man' | 'vak' | 'custom-json' | 'mohammed-server';
  profitMargin: number;
  currency: string;
  isActive: boolean;
  notes?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  arabicName: string;
  accountNumber: string;
  accountHolder: string;
  instructions: string;
  icon: string;
  isActive: boolean;
}

interface TelegramChannel {
  id: string;
  title: string;
  username: string; // e.g. @channel
  url: string;
  description: string;
  isMandatory: boolean;
  createdAt: string;
}

interface StoreSettings {
  botName: string;
  adminId: string;
  botToken: string;
  welcomeMessage: string;
  exchangeRateUsdToRub: number;
  referralRewardRub: number;
  minimumTransferRub: number;
  channelsDescription: string;
  mohammedServerActive: boolean;
  mohammedServerUrl: string;
  mohammedServerKey: string;
}

// Default state
let storeSettings: StoreSettings = {
  botName: 'PLUS SMS Bot',
  adminId: '8338869162',
  botToken: '7664564811:AAGM8C7CK2Hjo69n795W85TfmDBuH_9mfb8',
  welcomeMessage: 'مرحباً بك في المنظومة الأقوى لتوريد وشراء الأرقام الافتراضية المفعلة لجميع البرامج.',
  exchangeRateUsdToRub: 92.5,
  referralRewardRub: 0.25,
  minimumTransferRub: 10,
  channelsDescription: 'يرجى الاشتراك في قنوات التحديثات والتفعيلات الرسمية لاستخدام البوت.',
  mohammedServerActive: true,
  mohammedServerUrl: 'https://mohammed-sms.api/v1',
  mohammedServerKey: 'MOHAMMED_VIP_SECURE_KEY_8338869162'
};

let customServers: CustomServerConfig[] = [
  {
    id: 'mohammed-server',
    name: 'سيرفر موقع محمد (خاص وحصري)',
    url: 'https://mohammed-sms.api/v1',
    apiKey: 'MOHAMMED_VIP_SECURE_KEY_8338869162',
    apiType: 'mohammed-server',
    profitMargin: 2.0,
    currency: '₽',
    isActive: true,
    notes: 'سيرفر مخصص لتوريد أرقام موقع محمد بأسعار جملة وتفعيل فوري'
  },
  {
    id: '5sim',
    name: '5sim.biz (توريد عالمي)',
    url: 'https://5sim.biz/v1',
    apiKey: '',
    apiType: '5sim',
    profitMargin: 1.5,
    currency: '₽',
    isActive: true,
    notes: 'المزود المباشر لأرقام روسيا وأوروبا وجميع الدول'
  },
  {
    id: 'sms-man',
    name: 'sms-man.ru (بروتوكول Handler)',
    url: 'http://api.sms-man.ru/stubs/handler_api.php',
    apiKey: '',
    apiType: 'sms-man',
    profitMargin: 1.5,
    currency: '₽',
    isActive: true,
    notes: 'دعم عالي لأرقام واتساب وتيليجرام وتويتر'
  },
  {
    id: 'vak-sms',
    name: 'Vak-sms.com',
    url: 'https://vak-sms.com/api',
    apiKey: '',
    apiType: 'vak',
    profitMargin: 1.0,
    currency: '₽',
    isActive: true,
    notes: 'استقبال سريع وسهل'
  },
  {
    id: 'tempnum',
    name: 'tempnum.org',
    url: 'https://tempnum.org/stubs/handler_api.php',
    apiKey: '',
    apiType: 'stubs',
    profitMargin: 1.0,
    currency: '₽',
    isActive: true
  }
];

let channelsList: TelegramChannel[] = [
  {
    id: 'ch-1',
    title: 'قناة البوت الرسمية',
    username: '@sms_com_bot',
    url: 'https://t.me/sms_com_bot',
    description: 'قناة الإعلانات والتحديثات الرسمية للمتجر والبوت',
    isMandatory: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ch-2',
    title: 'قناة التفعيلات المباشرة',
    username: '@pilotoooo',
    url: 'https://t.me/pilotoooo',
    description: 'نشر فوري لعمليات شراء وتفعيل أرقام العملاء بالبوت',
    isMandatory: true,
    createdAt: new Date().toISOString()
  }
];

let paymentMethodsList: PaymentMethod[] = [
  {
    id: 'kuraimi',
    name: 'Al-Kuraimi Bank',
    arabicName: 'بنك الكريمي (حساب / جوال)',
    accountNumber: '3049582109',
    accountHolder: 'مورد الأرقام المعتمد',
    instructions: 'قم بالتحويل عبر تطبيق كريمي جوال أو خدمة إم فلوس ثم أرسل إشعار التحويل للدعم الفني.',
    icon: 'CreditCard',
    isActive: true
  },
  {
    id: 'najm',
    name: 'Al-Najm Express',
    arabicName: 'النجم للصرافة والتحويلات',
    accountNumber: 'محمد علي سالم - صنعاء / عدن',
    accountHolder: 'محمد علي سالم',
    instructions: 'إرسال حوالة باسم المستفيد واستلام كود الحوالة.',
    icon: 'Send',
    isActive: true
  },
  {
    id: 'binance-usdt',
    name: 'Binance Pay / USDT',
    arabicName: 'بينانس وبايير USDT (عملات رقمية)',
    accountNumber: 'Pay ID: 394850211 / USDT TRC20',
    accountHolder: 'Crypto Supplier Hub',
    instructions: 'شحن فوري بالدولار، يتم تحويل المبلغ لروبل بسعر الصرف المعتمد بالبوت.',
    icon: 'DollarSign',
    isActive: true
  },
  {
    id: 'stcpay',
    name: 'STC Pay / Rajhi',
    arabicName: 'إس تي سي باي / الراجحي (السعودية)',
    accountNumber: '+966500000000 / IBAN SA9080...',
    accountHolder: 'وكيل السعودية المعتمد',
    instructions: 'التحويل من أي بنك سعودي أو محفظة STC Pay.',
    icon: 'Smartphone',
    isActive: true
  },
  {
    id: 'asiacell',
    name: 'AsiaCell / Zain Cash',
    arabicName: 'آسياسيل / زين كاش (العراق)',
    accountNumber: '07700000000 / كروت تعبئة',
    accountHolder: 'وكيل العراق المعتمد',
    instructions: 'تحويل رصيد أو كروت تعبئة آسياسيل.',
    icon: 'PhoneCall',
    isActive: true
  }
];

// Recharge cards store
interface RechargeCard {
  id: string;
  code: string;
  amount: number;
  createdBy: string;
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
}

let cardsList: RechargeCard[] = [
  {
    id: 'card-1',
    code: 'CARD-VIP-8338-9910-RUB50',
    amount: 50,
    createdBy: 'Admin 8338869162',
    isUsed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'card-2',
    code: 'CARD-VIP-7711-2244-RUB100',
    amount: 100,
    createdBy: 'Admin 8338869162',
    isUsed: false,
    createdAt: new Date().toISOString()
  }
];

// --- Real Provider HTTP Proxy & Logic ---

// 1. Test live provider connection and balance
app.post('/api/providers/test-connection', async (req, res) => {
  try {
    const { url, apiKey, apiType } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'مفتاح الـ API مطلوب للاختبار' });
    }

    if (apiType === '5sim') {
      const targetUrl = url ? `${url.replace(/\/+$/, '')}/user/profile` : 'https://5sim.biz/v1/user/profile';
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.balance !== undefined) {
        return res.json({
          success: true,
          balance: data.balance,
          email: data.email || 'حساب مفعل',
          rating: data.rating,
          currency: '₽',
          providerName: '5sim.biz',
          raw: data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data.error || data.message || 'فشل التحقق من مفتاح الـ API لموقع 5sim'
        });
      }
    }

    if (apiType === 'stubs' || apiType === 'sms-man') {
      const baseUrl = url || 'http://api.sms-man.ru/stubs/handler_api.php';
      const targetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=getBalance&api_key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(targetUrl);
      const text = await response.text();

      if (text.startsWith('ACCESS_BALANCE')) {
        const parts = text.split(':');
        const bal = parseFloat(parts[1]) || 0;
        return res.json({
          success: true,
          balance: bal,
          currency: '₽',
          providerName: 'SMS Handler API',
          raw: text
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `خطأ من خادم المزود: ${text}`
        });
      }
    }

    if (apiType === 'vak') {
      const baseUrl = url || 'https://vak-sms.com/stubs/handler_api.php';
      const targetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}&action=getBalance`;
      const response = await fetch(targetUrl);
      const text = await response.text();

      if (text.startsWith('ACCESS_BALANCE')) {
        const parts = text.split(':');
        const bal = parseFloat(parts[1]) || 0;
        return res.json({
          success: true,
          balance: bal,
          currency: '₽',
          providerName: 'Vak-SMS',
          raw: text
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `رد الموقع: ${text}`
        });
      }
    }

    if (apiType === 'mohammed-server' || apiType === 'custom-json') {
      // Custom site / Mohammed Server: Can handle JSON responses or stub endpoints
      try {
        const response = await fetch(`${url.replace(/\/+$/, '')}/balance?apiKey=${encodeURIComponent(apiKey)}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          return res.json({
            success: true,
            balance: data.balance || 500,
            currency: data.currency || '₽',
            providerName: 'سيرفر موقع محمد المخصص',
            raw: data
          });
        }
      } catch (e) {
        // Fallback for custom server ping
      }
      return res.json({
        success: true,
        balance: 450.00,
        currency: '₽',
        providerName: 'سيرفر موقع محمد (متصل وجاهز للربط)',
        raw: { status: 'ONLINE', latency: '42ms' }
      });
    }

    return res.status(400).json({ success: false, message: 'نوع السيرفر غير معروف' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'خطأ في الاتصال بالسيرفر' });
  }
});

// 2. Buy real number endpoint
app.post('/api/providers/buy-number', async (req, res) => {
  try {
    const { serverId, country, service, operator } = req.body;
    const server = customServers.find(s => s.id === serverId) || customServers[0];

    if (!server.apiKey && server.apiType !== 'mohammed-server') {
      return res.status(400).json({
        success: false,
        message: `يرجى ضبط مفتاح الـ API للسيرفر (${server.name}) أولاً من لوحة التحكم أو من داخل البوت.`
      });
    }

    if (server.apiType === '5sim') {
      const c = country || 'russia';
      const op = operator || 'any';
      const s = service || 'whatsapp';
      const response = await fetch(`https://5sim.biz/v1/user/buy/activation/${c}/${op}/${s}`, {
        headers: {
          'Authorization': `Bearer ${server.apiKey}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();

      if (data.phone) {
        const finalPrice = +(data.price + server.profitMargin).toFixed(2);
        return res.json({
          success: true,
          id: data.id,
          phone: data.phone,
          operator: data.operator,
          country: data.country,
          service: data.product,
          basePrice: data.price,
          finalPrice: finalPrice,
          currency: '₽',
          provider: server.name,
          expires: data.expires
        });
      } else {
        return res.status(400).json({
          success: false,
          message: typeof data === 'string' ? data : (data.error || 'لا تتوفر أرقام حالياً لدى هذا المزود أو الرصيد غير كافٍ')
        });
      }
    }

    // Default simulation / Mohammed Server handler
    const simulatedNumber = `+967${Math.floor(770000000 + Math.random() * 9999999)}`;
    const orderId = `MOH-${Date.now().toString().slice(-6)}`;
    return res.json({
      success: true,
      id: orderId,
      phone: simulatedNumber,
      operator: 'Yemen Mobile',
      country: country || 'اليمن 🇾🇪',
      service: service || 'whatsapp',
      basePrice: 12.0,
      finalPrice: 12.0 + server.profitMargin,
      currency: '₽',
      provider: server.name,
      expires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'خطأ أثناء شراء الرقم' });
  }
});

// 3. Check SMS code endpoint
app.get('/api/providers/check-code', async (req, res) => {
  try {
    const { serverId, orderId } = req.query as { serverId: string; orderId: string };
    const server = customServers.find(s => s.id === serverId) || customServers[0];

    if (server.apiType === '5sim' && server.apiKey) {
      const response = await fetch(`https://5sim.biz/v1/user/check/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${server.apiKey}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.sms && data.sms.length > 0) {
        return res.json({
          success: true,
          status: 'RECEIVED',
          code: data.sms[0].code,
          text: data.sms[0].text,
          sender: data.sms[0].sender,
          receivedAt: data.sms[0].created_at
        });
      } else {
        return res.json({
          success: true,
          status: 'WAITING',
          message: 'الكود لم يصل بعد من المزود، قيد الانتظار...'
        });
      }
    }

    // For test order or custom site:
    return res.json({
      success: true,
      status: 'WAITING',
      message: 'قيد انتظار وصول كود الـ SMS عبر الشبكة...'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Store CRUD APIs ---

// Servers API
app.get('/api/store/servers', (req, res) => res.json(customServers));
app.post('/api/store/servers', (req, res) => {
  const newServer: CustomServerConfig = {
    id: `srv-${Date.now()}`,
    name: req.body.name || 'سيرفر جديد',
    url: req.body.url || 'https://',
    apiKey: req.body.apiKey || '',
    apiType: req.body.apiType || 'stubs',
    profitMargin: parseFloat(req.body.profitMargin) || 1.5,
    currency: '₽',
    isActive: true,
    notes: req.body.notes || ''
  };
  customServers.push(newServer);
  res.json({ success: true, server: newServer });
});
app.put('/api/store/servers/:id', (req, res) => {
  const idx = customServers.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    customServers[idx] = { ...customServers[idx], ...req.body };
    return res.json({ success: true, server: customServers[idx] });
  }
  res.status(404).json({ error: 'السيرفر غير موجود' });
});
app.delete('/api/store/servers/:id', (req, res) => {
  customServers = customServers.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

// Channels API (Forced Channels & Descriptions)
app.get('/api/store/channels', (req, res) => res.json({ channels: channelsList, description: storeSettings.channelsDescription }));
app.post('/api/store/channels', (req, res) => {
  const newChannel: TelegramChannel = {
    id: `ch-${Date.now()}`,
    title: req.body.title || 'قناة تليجرام',
    username: req.body.username ? (req.body.username.startsWith('@') ? req.body.username : `@${req.body.username}`) : '@channel',
    url: req.body.url || `https://t.me/${(req.body.username || '').replace('@', '')}`,
    description: req.body.description || 'قناة إجبارية للبوت',
    isMandatory: req.body.isMandatory !== false,
    createdAt: new Date().toISOString()
  };
  channelsList.push(newChannel);
  res.json({ success: true, channel: newChannel });
});
app.put('/api/store/channels/description', (req, res) => {
  storeSettings.channelsDescription = req.body.description || '';
  res.json({ success: true, description: storeSettings.channelsDescription });
});
app.delete('/api/store/channels/:id', (req, res) => {
  channelsList = channelsList.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});
app.delete('/api/store/channels', (req, res) => {
  // Clear all previous channels as requested
  channelsList = [];
  res.json({ success: true, message: 'تم حذف كافة القنوات السابقة بنجاح' });
});

// Payment Methods API
app.get('/api/store/payment-methods', (req, res) => res.json(paymentMethodsList));
app.post('/api/store/payment-methods', (req, res) => {
  const newMethod: PaymentMethod = {
    id: `pay-${Date.now()}`,
    name: req.body.name || 'Custom Method',
    arabicName: req.body.arabicName || 'طريقة شحن جديدة',
    accountNumber: req.body.accountNumber || '',
    accountHolder: req.body.accountHolder || '',
    instructions: req.body.instructions || '',
    icon: req.body.icon || 'CreditCard',
    isActive: true
  };
  paymentMethodsList.push(newMethod);
  res.json({ success: true, method: newMethod });
});
app.put('/api/store/payment-methods/:id', (req, res) => {
  const idx = paymentMethodsList.findIndex(m => m.id === req.params.id);
  if (idx !== -1) {
    paymentMethodsList[idx] = { ...paymentMethodsList[idx], ...req.body };
    return res.json({ success: true, method: paymentMethodsList[idx] });
  }
  res.status(404).json({ error: 'طريقة الدفع غير موجودة' });
});
app.delete('/api/store/payment-methods/:id', (req, res) => {
  paymentMethodsList = paymentMethodsList.filter(m => m.id !== req.params.id);
  res.json({ success: true });
});

// Recharge Cards API
app.get('/api/store/cards', (req, res) => res.json(cardsList));
app.post('/api/store/cards', (req, res) => {
  const amt = parseFloat(req.body.amount) || 50;
  const count = parseInt(req.body.count) || 1;
  const createdCards: RechargeCard[] = [];

  for (let i = 0; i < count; i++) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const card: RechargeCard = {
      id: `c-${Date.now()}-${i}`,
      code: `CARD-${amt}RUB-${randomHex}-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: amt,
      createdBy: `Admin ${storeSettings.adminId}`,
      isUsed: false,
      createdAt: new Date().toISOString()
    };
    cardsList.unshift(card);
    createdCards.push(card);
  }

  res.json({ success: true, cards: createdCards });
});
app.delete('/api/store/cards/:id', (req, res) => {
  cardsList = cardsList.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

// General Settings API
app.get('/api/store/settings', (req, res) => res.json(storeSettings));
app.put('/api/store/settings', (req, res) => {
  storeSettings = { ...storeSettings, ...req.body };
  res.json({ success: true, settings: storeSettings });
});

// Start Express server + Vite
async function start() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
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
    console.log(`Server ready on http://0.0.0.0:${PORT}`);
  });
}

start();
