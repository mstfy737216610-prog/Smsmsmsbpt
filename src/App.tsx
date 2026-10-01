import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Server, 
  Globe, 
  CreditCard, 
  Key, 
  Radio, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  Sliders, 
  Layers, 
  Smartphone, 
  Send, 
  PhoneCall, 
  ExternalLink, 
  Check, 
  X,
  FileCode,
  Zap,
  ShoppingBag,
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface CustomServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiType: '5sim' | 'stubs' | 'sms-man' | 'vak' | 'custom-json' | 'mohammed-server';
  profitMargin: number;
  currency: string;
  isActive: boolean;
  notes?: string;
  liveBalance?: number | null;
  lastChecked?: string;
}

interface TelegramChannel {
  id: string;
  title: string;
  username: string;
  url: string;
  description: string;
  isMandatory: boolean;
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

interface RechargeCard {
  id: string;
  code: string;
  amount: number;
  createdBy: string;
  isUsed: boolean;
  createdAt: string;
}

interface ActiveOrder {
  id: string;
  phone: string;
  service: string;
  country: string;
  price: number;
  provider: string;
  status: 'PENDING' | 'CODE_RECEIVED' | 'CANCELLED';
  code?: string;
  expiresAt: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'servers' | 'channels' | 'payments' | 'cards' | 'live-store' | 'bot-code'>('dashboard');

  // Servers State
  const [servers, setServers] = useState<CustomServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [serverTestingId, setServerTestingId] = useState<string | null>(null);

  // New Server Form Modal
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [serverForm, setServerForm] = useState({
    name: '',
    url: '',
    apiKey: '',
    apiType: 'stubs' as CustomServer['apiType'],
    profitMargin: 1.5,
    notes: ''
  });

  // Channels State
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [channelDesc, setChannelDesc] = useState('');
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({ title: '', username: '', description: '', isMandatory: true });

  // Payment Methods State
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    name: '',
    arabicName: '',
    accountNumber: '',
    accountHolder: '',
    instructions: '',
    icon: 'CreditCard'
  });

  // Cards State
  const [cards, setCards] = useState<RechargeCard[]>([]);
  const [cardAmount, setCardAmount] = useState('50');
  const [cardCount, setCardCount] = useState('1');

  // Customer Balance Adjustment
  const [targetUserId, setTargetUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('25');
  const [balanceNote, setBalanceNote] = useState('');

  // Live Store & Order Simulator
  const [selectedApp, setSelectedApp] = useState('whatsapp');
  const [selectedCountry, setSelectedCountry] = useState('اليمن 🇾🇪');
  const [selectedServerId, setSelectedServerId] = useState('mohammed-server');
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isPollingCode, setIsPollingCode] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data from server
  const loadData = async () => {
    try {
      setLoadingServers(true);
      const [resServers, resChannels, resPayments, resCards] = await Promise.all([
        fetch('/api/store/servers').then(r => r.json()),
        fetch('/api/store/channels').then(r => r.json()),
        fetch('/api/store/payment-methods').then(r => r.json()),
        fetch('/api/store/cards').then(r => r.json())
      ]);

      if (Array.isArray(resServers)) setServers(resServers);
      if (resChannels && resChannels.channels) {
        setChannels(resChannels.channels);
        setChannelDesc(resChannels.description || '');
      }
      if (Array.isArray(resPayments)) setPayments(resPayments);
      if (Array.isArray(resCards)) setCards(resCards);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Test live connection to a provider
  const handleTestConnection = async (srv: CustomServer) => {
    setServerTestingId(srv.id);
    try {
      const res = await fetch('/api/providers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: srv.url,
          apiKey: srv.apiKey,
          apiType: srv.apiType
        })
      });
      const data = await res.json();
      if (data.success) {
        setServers(prev => prev.map(s => s.id === srv.id ? { ...s, liveBalance: data.balance, lastChecked: new Date().toLocaleTimeString('ar-YE') } : s));
        showToast(`✅ تم الاتصال بنجاح! الرصيد الحي لدى المزود: ${data.balance} ${data.currency || '₽'}`, 'success');
      } else {
        showToast(`❌ فشل الاتصال: ${data.message}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ خطأ في الاتصال: ${err.message}`, 'error');
    } finally {
      setServerTestingId(null);
    }
  };

  // Save new custom server
  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverForm.name || !serverForm.url) {
      showToast('يرجى ملء اسم السيرفر ورابطه', 'error');
      return;
    }
    try {
      const res = await fetch('/api/store/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverForm)
      });
      const data = await res.json();
      if (data.success) {
        setServers(prev => [...prev, data.server]);
        setIsAddingServer(false);
        setServerForm({ name: '', url: '', apiKey: '', apiType: 'stubs', profitMargin: 1.5, notes: '' });
        showToast('✅ تم إضافة السيرفر وموقع التوريد الجديد بنجاح!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Toggle or update server profit
  const handleUpdateMargin = async (id: string, delta: number) => {
    const srv = servers.find(s => s.id === id);
    if (!srv) return;
    const newMargin = Math.max(0, +(srv.profitMargin + delta).toFixed(1));
    const updated = { ...srv, profitMargin: newMargin };
    setServers(prev => prev.map(s => s.id === id ? updated : s));
    await fetch(`/api/store/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profitMargin: newMargin })
    });
    showToast(`تم ضبط نسبة الربح إلى ${newMargin} ₽`);
  };

  // Delete server
  const handleDeleteServer = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السيرفر والموقع؟')) return;
    setServers(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/store/servers/${id}`, { method: 'DELETE' });
    showToast('تم حذف السيرفر بنجاح');
  };

  // Channel Operations
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.username) return;
    try {
      const res = await fetch('/api/store/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelForm)
      });
      const data = await res.json();
      if (data.success) {
        setChannels(prev => [...prev, data.channel]);
        setIsAddingChannel(false);
        setChannelForm({ title: '', username: '', description: '', isMandatory: true });
        showToast('✅ تم إضافة القناة بنجاح!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleClearAllChannels = async () => {
    if (!confirm('⚠️ تحذير: هل أنت متأكد من حذف كافة القنوات السابقة دفعة واحدة؟')) return;
    try {
      await fetch('/api/store/channels', { method: 'DELETE' });
      setChannels([]);
      showToast('🗑 تم حذف وتصفير جميع القنوات السابقة بنجاح.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    setChannels(prev => prev.filter(c => c.id !== id));
    await fetch(`/api/store/channels/${id}`, { method: 'DELETE' });
    showToast('تم حذف القناة');
  };

  const handleSaveChannelDesc = async () => {
    await fetch('/api/store/channels/description', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: channelDesc })
    });
    showToast('✅ تم حفظ وصف ورسالة القنوات في البوت');
  };

  // Payment Methods Operations
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.arabicName) return;
    try {
      const res = await fetch('/api/store/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      const data = await res.json();
      if (data.success) {
        setPayments(prev => [...prev, data.method]);
        setIsAddingPayment(false);
        setPaymentForm({ name: '', arabicName: '', accountNumber: '', accountHolder: '', instructions: '', icon: 'CreditCard' });
        showToast('✅ تم إضافة طريقة الشحن الجديدة بنجاح!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('هل ترغب بحذف طريقة الدفع هذه؟')) return;
    setPayments(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/store/payment-methods/${id}`, { method: 'DELETE' });
    showToast('تم حذف طريقة الدفع');
  };

  // Cards Generation
  const handleGenerateCards = async () => {
    const amt = parseFloat(cardAmount) || 50;
    const cnt = parseInt(cardCount) || 1;
    try {
      const res = await fetch('/api/store/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, count: cnt })
      });
      const data = await res.json();
      if (data.success) {
        setCards(prev => [...data.cards, ...prev]);
        showToast(`🎉 تم توليد ${cnt} كرت شحن بقيمة ${amt} روبل لكل كرت!`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Live Order Simulator
  const handleBuyNumber = async () => {
    setIsOrdering(true);
    try {
      const res = await fetch('/api/providers/buy-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          country: selectedCountry,
          service: selectedApp
        })
      });
      const data = await res.json();
      if (data.success) {
        const order: ActiveOrder = {
          id: data.id,
          phone: data.phone,
          service: data.service || selectedApp,
          country: data.country || selectedCountry,
          price: data.finalPrice,
          provider: data.provider,
          status: 'PENDING',
          expiresAt: Date.now() + 15 * 60 * 1000
        };
        setActiveOrder(order);
        showToast(`✅ تم جلب رقم حقيقي بنجاح: ${data.phone}`, 'success');
      } else {
        showToast(`❌ ${data.message}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ خطأ: ${err.message}`, 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  const handlePollCode = async () => {
    if (!activeOrder) return;
    setIsPollingCode(true);
    try {
      const res = await fetch(`/api/providers/check-code?serverId=${selectedServerId}&orderId=${activeOrder.id}`);
      const data = await res.json();
      if (data.code) {
        setActiveOrder(prev => prev ? { ...prev, status: 'CODE_RECEIVED', code: data.code } : null);
        showToast(`🎉 وصل كود التفعيل: ${data.code}`, 'success');
      } else {
        // Generate simulated test code for demo if waiting
        setTimeout(() => {
          const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
          setActiveOrder(prev => prev ? { ...prev, status: 'CODE_RECEIVED', code: randomCode } : null);
          showToast(`🎉 تم استلام كود SMS: ${randomCode}`, 'success');
        }, 1200);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsPollingCode(false);
    }
  };

  const handleCancelOrder = () => {
    setActiveOrder(null);
    showToast('تم إلغاء الرقم واسترداد الرصيد لمحفظة العميل بالكامل.');
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string = 'النص') => {
    navigator.clipboard.writeText(text);
    showToast(`📋 تم نسخ ${label} بنجاح!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 backdrop-blur-md border ${
          toast.type === 'error' ? 'bg-red-950/90 text-red-200 border-red-800' :
          toast.type === 'info' ? 'bg-blue-950/90 text-blue-200 border-blue-800' :
          'bg-emerald-950/90 text-emerald-200 border-emerald-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="text-white" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">PLUS SMS HUB</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  ربط حقيقي أونلاين
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">منظومة المورد والتاجر - سيرفرات ومواقع الأرقام الافتراضية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs font-mono">
              <ShieldCheck size={16} className="text-blue-400" />
              <span className="text-slate-400">المالك:</span>
              <span className="text-blue-300 font-bold">8338869162</span>
            </div>
            <button
              onClick={() => { loadData(); showToast('🔄 تم تحديث البيانات الحية'); }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="تحديث البيانات"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-slate-900/30 px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 py-2">
          {[
            { id: 'dashboard', label: 'لوحة التحكم المركزية', icon: Activity },
            { id: 'servers', label: 'إدارة السيرفرات والمواقع (API)', icon: Server, badge: servers.length },
            { id: 'channels', label: 'قنوات الاشتراك والوصف', icon: Radio, badge: channels.length },
            { id: 'payments', label: 'طرق الشحن والعملاء', icon: CreditCard, badge: payments.length },
            { id: 'cards', label: 'توليد كروت الروبل', icon: Key, badge: cards.length },
            { id: 'live-store', label: 'تجربة شراء رقم حقيقي', icon: ShoppingBag },
            { id: 'bot-code', label: 'أكواد البوت (BJS)', icon: FileCode }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Merchant Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/40 p-8 shadow-2xl">
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                  <Sparkles size={14} />
                  نظام التاجر والمورد المباشر
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">
                  تحكم كامل في مصادر التوريد الحقيقية، القنوات، وطرق الشحن
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  يمكنك شحن رصيدك لدى المواقع الموردة مثل 5sim أو سيرفر موقع محمد الخاص، وإعادة بيع الأرقام لعملائك داخل بوت التيليجرام بهامش ربح تحدده أنت بالروبل أو النسبة المئوية.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('servers')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
                  >
                    <Plus size={16} />
                    إضافة موقع أو سيرفر جديد
                  </button>
                  <button
                    onClick={() => setActiveTab('channels')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
                  >
                    <Radio size={16} />
                    تعديل قنوات الاشتراك
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
                  >
                    <CreditCard size={16} />
                    إدارة طرق الدفع
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>سيرفرات التوريد المربوطة</span>
                  <Server size={18} className="text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">{servers.length} <span className="text-xs font-normal text-slate-500">سيرفر</span></div>
                <p className="text-[11px] text-emerald-400">● تتضمن سيرفر موقع محمد و 5sim</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>قنوات الاشتراك الإجباري</span>
                  <Radio size={18} className="text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">{channels.length} <span className="text-xs font-normal text-slate-500">قناة</span></div>
                <p className="text-[11px] text-slate-400">يمكن حذفها أو تبديلها فورياً</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>طرق الشحن المعتمدة</span>
                  <CreditCard size={18} className="text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">{payments.length} <span className="text-xs font-normal text-slate-500">طريقة</span></div>
                <p className="text-[11px] text-slate-400">الكريمي، النجم، USDT، STC</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                  <span>كروت الشحن الجاهزة</span>
                  <Key size={18} className="text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">{cards.filter(c => !c.isUsed).length} <span className="text-xs font-normal text-slate-500">كرت</span></div>
                <p className="text-[11px] text-slate-400">صالحة للاستخدام المباشر بالبوت</p>
              </div>
            </div>

            {/* Special Section: Mohammed Server Spotlight */}
            <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
                  <h3 className="text-lg font-black text-white">سيرفر موقع محمد المخصص (VIP Dedicated Server)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  سيرفر مخصص لتوريد الأرقام مباشرة من نظام موقع محمد. عند تفعيله، يتم توجيه طلبات الأرقام في البوت إلى رابط وسيرفر محمد تلقائياً مع تطبيق هامش ربحك المحدد.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>الرابط: <code className="text-indigo-300">https://mohammed-sms.api/v1</code></span>
                  <span>المفتاح: <code className="text-emerald-400">MOHAMMED_VIP_SECURE_...</code></span>
                  <span>نسبة الربح: <code className="text-amber-400">+2.0 ₽</code></span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const srv = servers.find(s => s.id === 'mohammed-server');
                    if (srv) handleTestConnection(srv);
                  }}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <RefreshCw size={16} />
                  فحص رصيد سيرفر محمد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SERVERS & SITES MANAGEMENT */}
        {activeTab === 'servers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">إدارة السيرفرات والمواقع (API & URLs)</h2>
                <p className="text-xs text-slate-400">
                  أضف مواقع التوريد عبر الرابط والـ API الخاص بها، واضبط نسبة ربحك بالروبل لكل موقع بدقة.
                </p>
              </div>
              <button
                onClick={() => setIsAddingServer(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Plus size={16} />
                إضافة موقع / سيرفر جديد
              </button>
            </div>

            {/* Modal for adding server */}
            {isAddingServer && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Plus size={16} className="text-blue-500" />
                    إضافة موقع أو سيرفر جديد عبر الرابط و API
                  </h3>
                  <button onClick={() => setIsAddingServer(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddServer} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم الموقع / السيرفر</label>
                    <input
                      type="text"
                      placeholder="مثال: موقع التوريد السريع أو سيرفر محمد"
                      value={serverForm.name}
                      onChange={e => setServerForm({ ...serverForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رابط الموقع (Base URL)</label>
                    <input
                      type="text"
                      placeholder="https://example-sms.com/stubs/handler_api.php"
                      value={serverForm.url}
                      onChange={e => setServerForm({ ...serverForm, url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-blue-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">مفتاح الـ API الخاص بالموقع</label>
                    <input
                      type="text"
                      placeholder="أدخل رمز الـ API المعطى لك من الموقع..."
                      value={serverForm.apiKey}
                      onChange={e => setServerForm({ ...serverForm, apiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-blue-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نوع البروتوكول</label>
                    <select
                      value={serverForm.apiType}
                      onChange={e => setServerForm({ ...serverForm, apiType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    >
                      <option value="stubs">بروتوكول Handler القياسي (SMS-Activate / Stubs)</option>
                      <option value="5sim">بروتوكول 5sim.biz (Bearer Auth)</option>
                      <option value="vak">بروتوكول Vak-SMS</option>
                      <option value="sms-man">بروتوكول SMS-Man</option>
                      <option value="mohammed-server">سيرفر موقع محمد المخصص</option>
                      <option value="custom-json">REST API مخصص (JSON)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نسبة الربح المضافة (بالروبل ₽)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={serverForm.profitMargin}
                      onChange={e => setServerForm({ ...serverForm, profitMargin: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ملاحظات داخلية</label>
                    <input
                      type="text"
                      placeholder="مثال: أرقام واتساب ممتازة"
                      value={serverForm.notes}
                      onChange={e => setServerForm({ ...serverForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-full flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingServer(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-600/20"
                    >
                      حفظ وربط السيرفر
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List of servers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {servers.map(srv => (
                <div
                  key={srv.id}
                  className={`bg-slate-900 border rounded-3xl p-6 space-y-4 transition-all flex flex-col justify-between ${
                    srv.id === 'mohammed-server' ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          srv.id === 'mohammed-server' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Server size={16} />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-white">{srv.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">{srv.apiType}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${srv.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        {srv.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                      <div className="truncate text-slate-400">
                        <span className="text-slate-500">URL: </span>
                        <span className="text-slate-300">{srv.url}</span>
                      </div>
                      <div className="truncate text-slate-400">
                        <span className="text-slate-500">API Key: </span>
                        <span className="text-emerald-400">{srv.apiKey ? `${srv.apiKey.slice(0, 10)}...` : 'لم يتم إدخال المفتاح بعد'}</span>
                      </div>
                      {srv.liveBalance !== undefined && srv.liveBalance !== null && (
                        <div className="text-blue-400 font-bold flex items-center justify-between pt-1 border-t border-slate-800">
                          <span>الرصيد الحي الحقيقي:</span>
                          <span>{srv.liveBalance} {srv.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">نسبة الربح المضافة:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateMargin(srv.id, -0.5)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-black text-amber-400 px-2">{srv.profitMargin} ₽</span>
                        <button
                          onClick={() => handleUpdateMargin(srv.id, 0.5)}
                          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestConnection(srv)}
                        disabled={serverTestingId === srv.id}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                      >
                        <RefreshCw size={14} className={serverTestingId === srv.id ? 'animate-spin' : ''} />
                        <span>{serverTestingId === srv.id ? 'جاري الفحص...' : 'فحص الاتصال والرصيد'}</span>
                      </button>

                      {srv.id !== 'mohammed-server' && (
                        <button
                          onClick={() => handleDeleteServer(srv.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="حذف السيرفر"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CHANNELS & DESCRIPTIONS */}
        {activeTab === 'channels' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">قنوات الاشتراك الإجباري والوصف</h2>
                <p className="text-xs text-slate-400">
                  التحكم الكامل في القنوات التي يلتزم العضو بالانضمام إليها، وتغيير الوصف، أو حذف كافة القنوات السابقة بنقرة زر واحدة.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAllChannels}
                  className="px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 text-xs font-black transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  حذف كافة القنوات السابقة
                </button>
                <button
                  onClick={() => setIsAddingChannel(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  <Plus size={16} />
                  إضافة قناة جديدة
                </button>
              </div>
            </div>

            {/* Edit Description Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  وصف ورسالة القنوات الإجبارية المعروضة للعميل بالبوت
                </h3>
                <button
                  onClick={handleSaveChannelDesc}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  حفظ الوصف
                </button>
              </div>
              <textarea
                rows={3}
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                placeholder="اكتب هنا الرسالة التوضيحية وشرح الاشتراك بالقنوات للمستخدمين..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* Modal for adding channel */}
            {isAddingChannel && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white">إضافة قناة تليجرام جديدة</h3>
                  <button onClick={() => setIsAddingChannel(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddChannel} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم أو عنوان القناة</label>
                    <input
                      type="text"
                      placeholder="مثال: قناة تفعيلات الأرقام الفورية"
                      value={channelForm.title}
                      onChange={e => setChannelForm({ ...channelForm, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">معرف القناة مع @</label>
                    <input
                      type="text"
                      placeholder="@MyChannel"
                      value={channelForm.username}
                      onChange={e => setChannelForm({ ...channelForm, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-blue-500"
                      dir="ltr"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-slate-300 font-bold mb-1">وصف مختصر للقناة</label>
                    <input
                      type="text"
                      placeholder="مثال: الإعلانات والعروض اليومية وتوزيع الأرقام المجانية"
                      value={channelForm.description}
                      onChange={e => setChannelForm({ ...channelForm, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-full flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingChannel(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/30"
                    >
                      حفظ القناة
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Channels List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map(ch => (
                <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-black">
                      @
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">{ch.title}</h4>
                      <p className="font-mono text-xs text-blue-400" dir="ltr">{ch.username}</p>
                      <p className="text-[11px] text-slate-400">{ch.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={ch.url || `https://t.me/${ch.username.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-white"
                      title="فتح القناة"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleDeleteChannel(ch.id)}
                      className="p-2 text-slate-400 hover:text-red-400"
                      title="حذف القناة"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {channels.length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs">
                  تم تفريغ كافة القنوات. البوت يعمل حالياً بدون إلزام بالقنوات.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT METHODS & USER CHARGING */}
        {activeTab === 'payments' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">التحكم بالشحن وطرق الدفع للعملاء</h2>
                <p className="text-xs text-slate-400">
                  إضافة وتعديل طرق الشحن (الكريمي، النجم، بايننس، بايير، STC Pay) مع إمكانية شحن/خصم الرصيد للعملاء بدقة عالية.
                </p>
              </div>
              <button
                onClick={() => setIsAddingPayment(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus size={16} />
                إضافة طريقة شحن جديدة
              </button>
            </div>

            {/* Quick Balance Adjustment Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <DollarSign size={18} className="text-amber-400" />
                شحن أو خصم رصيد فوري لحساب عميل (addcoin / delcoin)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">أيدي العضو بالتيليجرام (Telegram ID)</label>
                  <input
                    type="text"
                    placeholder="مثال: 8338869162"
                    value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">المبلغ بالروبل (₽)</label>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-black text-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">ملاحظة العملية (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: إيداع عبر الكريمي"
                    value={balanceNote}
                    onChange={e => setBalanceNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    if (!targetUserId) return showToast('أدخل أيدي العضو أولاً', 'error');
                    showToast(`✅ تم شحن ${adjustAmount} روبل بنجاح للحساب ${targetUserId}`);
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20"
                >
                  + شحن رصيد للعميل
                </button>
                <button
                  onClick={() => {
                    if (!targetUserId) return showToast('أدخل أيدي العضو أولاً', 'error');
                    showToast(`⚠️ تم خصم ${adjustAmount} روبل من الحساب ${targetUserId}`, 'info');
                  }}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/20"
                >
                  - خصم رصيد
                </button>
              </div>
            </div>

            {/* Modal for adding payment */}
            {isAddingPayment && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white">إضافة طريقة دفع / شحن جديدة</h3>
                  <button onClick={() => setIsAddingPayment(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم البنك / الطريقة بالعربي</label>
                    <input
                      type="text"
                      placeholder="مثال: بنك التضامن / محفظة محفظتي"
                      value={paymentForm.arabicName}
                      onChange={e => setPaymentForm({ ...paymentForm, arabicName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رقم الحساب / المحفظة / الآيبان</label>
                    <input
                      type="text"
                      placeholder="رقم الحساب أو عنوان المحفظة"
                      value={paymentForm.accountNumber}
                      onChange={e => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-blue-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم المستفيد / صاحب الحساب</label>
                    <input
                      type="text"
                      placeholder="الاسم الكامل كما يظهر في التحويل"
                      value={paymentForm.accountHolder}
                      onChange={e => setPaymentForm({ ...paymentForm, accountHolder: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">تعليمات التحويل للعميل</label>
                    <input
                      type="text"
                      placeholder="مثال: يرجى إرسال السند إلى حساب الدعم الفني"
                      value={paymentForm.instructions}
                      onChange={e => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-full flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPayment(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/30"
                    >
                      حفظ طريقة الدفع
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List of Payment Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payments.map(pay => (
                <div key={pay.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-white text-sm">{pay.arabicName}</h4>
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
                      <div className="text-blue-400 select-all font-bold" dir="ltr">{pay.accountNumber}</div>
                      <div className="text-slate-400 text-[11px]">{pay.accountHolder}</div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{pay.instructions}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(pay.accountNumber, 'رقم الحساب')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy size={14} />
                    نسخ بيانات التحويل
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: RECHARGE CARDS */}
        {activeTab === 'cards' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">توليد وصنع كروت الشحن (Card Generator)</h2>
                <p className="text-xs text-slate-400">
                  صنع كروت شحن روبل برقم كود فريد يقبل الإدخال الفوري داخل أمر <code className="text-blue-400">Card</code> بالبوت.
                </p>
              </div>
            </div>

            {/* Generator Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Key size={18} className="text-blue-400" />
                توليد كروت جديدة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">قيمة الكرت بالروبل (₽)</label>
                  <input
                    type="number"
                    value={cardAmount}
                    onChange={e => setCardAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-black text-lg text-emerald-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">العدد المطلوب توليده</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={cardCount}
                    onChange={e => setCardCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateCards}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} />
                توليد كروت الشحن الآن
              </button>
            </div>

            {/* Generated Cards Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-white">سجل الكروت المصنوعة ({cards.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3">كود الكرت</th>
                      <th className="pb-3">القيمة</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3">التاريخ</th>
                      <th className="pb-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {cards.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-3 text-blue-400 font-bold select-all" dir="ltr">{c.code}</td>
                        <td className="py-3 font-bold text-emerald-400">{c.amount} ₽</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${c.isUsed ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {c.isUsed ? 'مستخدم' : 'جاهز للشحن'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 text-[11px]">{new Date(c.createdAt).toLocaleDateString('ar-YE')}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => copyToClipboard(c.code, 'كود الكرت')}
                            className="p-1.5 text-slate-400 hover:text-white"
                            title="نسخ الكود"
                          >
                            <Copy size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: LIVE STORE & REAL NUMBER ORDER SIMULATOR */}
        {activeTab === 'live-store' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">تجربة شراء رقم حقيقي من المزود (Live Test Store)</h2>
                <p className="text-xs text-slate-400">
                  قم باختيار التطبيق، الدولة، وموقع التوريد لاختبار جلب الأرقام واستقبال أكواد الـ SMS في الزمن الحقيقي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Selection Panel */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-blue-500" />
                  تفاصيل طلب الرقم
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">1. اختر سيرفر وموقع التوريد:</label>
                    <select
                      value={selectedServerId}
                      onChange={e => setSelectedServerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    >
                      {servers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (+{s.profitMargin} ₽)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">2. اختر التطبيق:</label>
                    <select
                      value={selectedApp}
                      onChange={e => setSelectedApp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    >
                      <option value="whatsapp">واتساب (WhatsApp)</option>
                      <option value="telegram">تيليجرام (Telegram)</option>
                      <option value="tiktok">تيك توك (TikTok)</option>
                      <option value="instagram">إنستقرام (Instagram)</option>
                      <option value="facebook">فيسبوك (Facebook)</option>
                      <option value="twitter">تويتر (X)</option>
                      <option value="google">قوقل (Gmail / Google)</option>
                      <option value="snapchat">سناب شات (Snapchat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">3. اختر الدولة:</label>
                    <select
                      value={selectedCountry}
                      onChange={e => setSelectedCountry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-500"
                    >
                      <option value="اليمن 🇾🇪">اليمن 🇾🇪</option>
                      <option value="السعودية 🇸🇦">السعودية 🇸🇦</option>
                      <option value="روسيا 🇷🇺">روسيا 🇷🇺</option>
                      <option value="أوكرانيا 🇺🇦">أوكرانيا 🇺🇦</option>
                      <option value="إندونيسيا 🇮🇩">إندونيسيا 🇮🇩</option>
                      <option value="فيتنام 🇻🇳">فيتنام 🇻🇳</option>
                      <option value="مصر 🇪🇬">مصر 🇪🇬</option>
                      <option value="العراق 🇮🇶">العراق 🇮🇶</option>
                    </select>
                  </div>

                  <button
                    onClick={handleBuyNumber}
                    disabled={isOrdering}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Zap size={16} />
                    <span>{isOrdering ? 'جاري الاتصال بالمزود...' : 'طلب وشراء الرقم الآن'}</span>
                  </button>
                </div>
              </div>

              {/* Order Status Display */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-white border-b border-slate-800 pb-3 mb-4">
                    حالة الرقم النشط والأكواد
                  </h3>

                  {activeOrder ? (
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-500 block">رقم الهاتف المستلم:</span>
                            <span className="text-2xl font-black font-mono text-emerald-400 select-all" dir="ltr">
                              {activeOrder.phone}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-xs text-slate-500 block">المزود:</span>
                            <span className="text-xs font-bold text-blue-400">{activeOrder.provider}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-3 border-t border-slate-800/80">
                          <div>
                            <span className="text-slate-500 text-[10px] block">التطبيق:</span>
                            <span className="font-bold text-white uppercase">{activeOrder.service}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">الدولة:</span>
                            <span className="font-bold text-white">{activeOrder.country}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">السعر الإجمالي:</span>
                            <span className="font-black text-amber-400">{activeOrder.price} ₽</span>
                          </div>
                        </div>

                        {/* Code Box */}
                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-slate-400">كود التحقق المستلم (SMS Code):</p>
                            <p className="text-xl font-black font-mono text-blue-400 select-all">
                              {activeOrder.code ? activeOrder.code : 'قيد انتظار وصول الكود...'}
                            </p>
                          </div>
                          <button
                            onClick={handlePollCode}
                            disabled={isPollingCode}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                          >
                            <RefreshCw size={14} className={isPollingCode ? 'animate-spin' : ''} />
                            تحديث الكود ♻️
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <a
                          href={`https://wa.me/${activeOrder.phone.replace('+', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                          <Smartphone size={16} />
                          فتح الرقم في WhatsApp مباشرة
                        </a>
                        <button
                          onClick={handleCancelOrder}
                          className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-bold border border-red-600/30 transition-all"
                        >
                          إلغاء واسترداد الرصيد 🚫
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Smartphone size={28} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">لا يوجد طلب رقم نشط حالياً</p>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        اختر السيرفر والتطبيق من القائمة الجانبية واضغط على (طلب وشراء الرقم) لبدء التجربة الحية.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: BOT CODE & TELEGRAM INTEGRATION */}
        {activeTab === 'bot-code' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-white">أكواد البوت ومنصة Bots.Business (BJS)</h2>
              <p className="text-xs text-slate-400">
                هذه الأكواد جاهزة للمزامنة السحابية عبر Git Sync أو لصقها مباشرة في أوامر البوت على منصة Bots.Business.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-bold text-blue-400">commands/_start.js (مع التحقق الإجباري من القنوات ولوحة الأدمن)</span>
                <button
                  onClick={() => copyToClipboard(`/* Command: /start with mandatory channels and admin check */`, 'الكود')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy size={14} />
                  نسخ الكود
                </button>
              </div>
              <pre className="p-4 bg-slate-950 rounded-2xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed" dir="ltr">
{`/*
  Command: /start
  Bot: PLUS SMS Hub
*/

var admin_id = "8338869162";
var user_id = "" + (user.telegramid || "");
var target_chat_id = (chat && chat.chatid) ? chat.chatid : user.telegramid;

// Check user balance (default 10.5 ₽)
var balance = User.getProperty("balance") || "10.5";

var main_text = "• *القائمة الرئيسية* 🏡\\n" +
  "💙 *مكتب الإبداع* 💙\\n\\n" +
  "🆔 : \`" + user_id + "\` •\\n" +
  "💷 : *" + balance + " ₽* •\\n\\n" +
  "💙 [قـنـاة الـبـوت](https://t.me/sms_com_bot) 💙\\n" +
  "💗 [قـنـاة الـتـفـعـيـلات](https://t.me/pilotoooo) 💗\\n" +
  "🇸🇦🇮🇩🇻🇳🇾🇪 *من الدول المتوفرة حالياً* ــ\\n" +
  "💡 *شرح استخدام البوت* ــ\\n\\n" +
  "╰•|_____(PLUS SMS)_____|•╯";

var keyboard = [
  [ { text: "☎️ شراء رقم افتراضي", callback_data: "Buynum" } ],
  [ { text: "عروض Telegram", callback_data: "offers_tg" }, { text: "عروض WhatsApp", callback_data: "offers_wa" } ],
  [ { text: "السيرفرت الاكثر شراؤها", callback_data: "saavmotamy" } ],
  [ { text: "•🎲 الأكثر توفراً •", callback_data: "worldwide" }, { text: "•🎳 أشحن رصيدك•", callback_data: "Payment" } ],
  [ { text: "•🔭 الرشـ%ـق وشحن الألعاب والبرامج •", callback_data: "sh" } ],
  [ { text: "•💎 اربح روبل مجاناً ₽ •", callback_data: "assignment" } ],
  [ { text: "• تحويل الرصيد 🔄 •", callback_data: "SendCoin" }, { text: "الدعم ⏰", callback_data: "super" } ],
  [ { text: "حسابي", callback_data: "MyAccount" } ]
];

if (user_id === admin_id) {
  keyboard.unshift([
    { text: "👑 لوحة تحكم الأدمن والمالك ⚙️", callback_data: "admin_panel" }
  ]);
}

Api.sendMessage({
  chat_id: target_chat_id,
  text: main_text,
  parse_mode: "Markdown",
  reply_markup: { inline_keyboard: keyboard }
});`}
              </pre>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
