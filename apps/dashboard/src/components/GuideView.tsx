'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Layers,
  Terminal,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  Server,
  FileText,
  Cpu,
  ArrowRight,
  Sparkles,
  Lock,
  Workflow,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  Search
} from 'lucide-react';
import { TabType } from './Header';

interface GuideViewProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenNewRun: (initialTask?: string) => void;
}

interface FeatureGuide {
  id: TabType;
  title: string;
  badge: string;
  icon: React.ReactNode;
  summary: string;
  whatItDoes: string[];
  howToUse: string[];
  tips: string[];
  exampleAction?: {
    label: string;
    task: string;
  };
}

export default function GuideView({ onNavigateTab, onOpenNewRun }: GuideViewProps) {
  const [activeSection, setActiveSection] = useState<TabType | 'architecture'>('architecture');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const featureGuides: FeatureGuide[] = [
    {
      id: 'overview',
      title: 'Genel Bakış (Overview)',
      badge: 'Sistem Durumu',
      icon: <BarChart3 className="w-5 h-5 text-sky-400" />,
      summary: 'AgentLab platformunun anlık sağlık durumunu, başarı oranlarını ve kilit metrikleri gösterir.',
      whatItDoes: [
        'Aktif çalışan ajanları, ortalama değerlendirme puanını ve başarı oranını gösterir.',
        'Bekleyen insan onaylarını ve kritik güvenlik uyarılarını tek bakışta özetler.',
        'Son tamamlanan veya devam eden ajan çalışmalarını (runs) kartlar halinde listeler.',
        'Sistem genelindeki operasyonel verimi izlemenizi sağlar.'
      ],
      howToUse: [
        '1. Dashboard açıldığında ilk karşılayan ekrandır.',
        '2. Üst kısımdaki KPI kartlarından sistem başarı oranını (%100 hedef) kontrol edin.',
        '3. Sağ üstteki "Run Agent" butonuna basarak yeni bir analiz başlatabilirsiniz.',
        '4. Son çalışmalardan birine tıklayarak doğrudan o analizin detaylı trace akışına gidin.'
      ],
      tips: [
        'Değerlendirme puanı %95 altına düştüğünde "Evaluations" sekmesinden kırılımları inceleyin.',
        'Bekleyen onay bildirimi kırmızı yanıyorsa "Approvals" sekmesinde bekleyen operasyon vardır.'
      ]
    },
    {
      id: 'runs',
      title: 'Çalışmalar ve Ajan İzleri (Runs & Traces)',
      badge: 'Detaylı İnceleme',
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      summary: 'Ajanların her adımını (Plan, Tool Çağrısı, Hakem İncelemesi, Değerlendirme) milisaniye seviyesinde izleyin.',
      whatItDoes: [
        'Tüm geçmiş analiz görevlerini filtreler (tamamlanan, revize edilen, onay bekleyen).',
        'Seçilen analizin Planner -> Worker -> Reviewer -> Evaluator adımlarını kronolojik gösterir.',
        'Hangi MCP tool\'unun ne zaman ve hangi argümanlarla çağrıldığını görüntüler.',
        'Ajanın nihai raporunu ve dayanak kanıtlarını (evidence) şeffaf şekilde listeler.'
      ],
      howToUse: [
        '1. Sol listeden incelemek istediğiniz çalışmayı seçin (veya üstteki filtreden aratın).',
        '2. Orta panelde ajanın ürettiği yapılandırılmış nihai raporu okuyun.',
        '3. "Execution Trace" sekmesine tıklayarak ajanlar arası paslaşmaları ve tool çağrılarını inceleyin.',
        '4. "Reviewer & Guardrails" sekmesinde hakem ajanın kanıtları nasıl doğruladığını görün.'
      ],
      tips: [
        'Revizyon (review_iterations > 0) olan çalışmalar, hakem ajanın eksik kanıt tespit edip çalışanı tekrar çalıştırdığı durumlardır.',
        'Ajanların asla kanıt olmadan "kesin nedeni budur" gibi varsayımlar yapmasına izin verilmez.'
      ],
      exampleAction: {
        label: 'Retention Analizi Başlat',
        task: 'Why did D1 retention drop yesterday?'
      }
    },
    {
      id: 'skills',
      title: 'Skill Kataloğu & Oyun Alanı (Skills & Playground)',
      badge: 'Yetenek Yönetimi',
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      summary: 'Ajanların uzmanlaştığı yetenekleri (SKILL.md) inceleyin, yeni sürümleri test edin ve karşılaştırın.',
      whatItDoes: [
        'Kayıtlı skill\'leri (Oyun Metrikleri Analizi, Crash İnceleme, LiveOps vb.) versiyonlarıyla listeler.',
        'Her yeteneğin gereksinim duyduğu kanıtları ve kullandığı MCP araçlarını tanımlar.',
        'Canlı ve Aday (Candidate) sürümleri yan yana koyarak regresyon testi yapmanızı sağlar.',
        'Aday sürümün kalite puanı canlı sürümden düşükse canlıya geçişi (promote) otomatik kilitler.'
      ],
      howToUse: [
        '1. Sol menüden bir yetenek seçin (örneğin: analyze-game-metrics).',
        '2. "SKILL.md & Prompt" sekmesinden yeteneğin sistem talimatlarını inceleyin.',
        '3. "Version Comparison" sekmesine geçin; v1.0.0 ile v1.1.0 arasındaki farkları görün.',
        '4. "Compare in Playground" butonuna tıklayarak her iki versiyonu aynı görevde yarıştırın.'
      ],
      tips: [
        'v1.0.0 sürümü kullanıcı kırılımı (segmentation) adımını içermediği için hakem tarafından reddedilir.',
        'v1.1.0 sürümü ise eksiksiz kanıt toplayarak %100 başarıyla tek seferde geçer.'
      ]
    },
    {
      id: 'evals',
      title: 'Otomatik Değerlendirme & Regresyon (Evaluations)',
      badge: 'Kalite Güvencesi',
      icon: <CheckCircle2 className="w-5 h-5 text-teal-400" />,
      summary: '18 senaryoluk otomatik test matrisi ile ajan yeteneklerini nesnel ve deterministik olarak puanlar.',
      whatItDoes: [
        '5 Temel Boyut: Doğruluk (30%), Görev Tamamlama (25%), Tool Kullanımı (20%), Güvenlik (15%), Verimlilik (10%).',
        'Zorunlu adımların atlanıp atlanmadığını, yasaklı tool\'ların çağrılıp çağrılmadığını kontrol eder.',
        'Regresyon Koruma Kalkanı: Eskiden geçen bir test başarısız olursa sisteme kırmızı alarm verir.',
        'YAML tabanlı genişletilebilir test vakaları barındırır.'
      ],
      howToUse: [
        '1. "Run Evaluation Suite" butonuna basarak tüm senaryoları anında çalıştırın.',
        '2. Skor matrisinden senaryo bazlı başarı durumunu (Passed / Failed) kontrol edin.',
        '3. Herhangi bir senaryonun üzerine tıklayarak beklenen çıktılar ile elde edilen adımları karşılaştırın.'
      ],
      tips: [
        'Ajan kodunda veya skill dosyasında bir değişiklik yaptığınızda daima evaluation suite\'i çalıştırın.',
        'Güvenlik testleri (Safety Refusal) kritik araçların doğrudan çalıştırılmadığını teyit eder.'
      ]
    },
    {
      id: 'mcp',
      title: 'MCP Sunucuları & Güvenlik Laboratuvarı (MCP & Safety Lab)',
      badge: 'Güvenlik & İzolasyon',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      summary: 'Model Context Protocol (MCP) araçlarının risk seviyelerini yönetin ve Docker sandbox ortamını test edin.',
      whatItDoes: [
        '3 MCP Sunucusu: Game Analytics (8 tools), LiveOps (6 tools), Git (5 tools).',
        'Risk Kademeleri: LOW (Okuma), MEDIUM (Analiz), HIGH (Taslak oluşturma), CRITICAL (Canlı yayını).',
        'Terminal Sandbox Denetleyicisi: Zararlı komutları (rm -rf, curl, eval) filtreler.',
        'İzole Docker sandbox ortamında sıfır ağ (`--network none`) ile güvenli komut çalıştırmayı test eder.'
      ],
      howToUse: [
        '1. Sol taraftan MCP sunucularını ve sağladıkları tool listesini inceleyin.',
        '2. Bir tool\'un risk seviyesini ve onay gereksinimini görün (örn: publish_event = CRITICAL).',
        '3. "Sandbox Terminal Tester" bölümüne geçin.',
        '4. "Test Safe Command" veya "Test Dangerous Exploit" butonlarına basarak güvenlik duvarının nasıl davrandığını canlı izleyin.'
      ],
      tips: [
        'Tehlikeli komutlar önce Regex & Metakarakter filtresine takılır, onaylansa bile ağsız Docker konteynerinde hapsedilir.',
        'CRITICAL seviyesindeki hiçbir işlem otonom ajan tarafından doğrudan canlıya uygulanamaz.'
      ]
    },
    {
      id: 'approvals',
      title: 'İnsan Onayı İş Akışı (Human-in-the-Loop Approvals)',
      badge: 'Üretim Güvenliği',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      summary: 'Canlı oyunu etkileyebilecek tüm parametre değişiklikleri için insan onay kuyruğu.',
      whatItDoes: [
        'Ajanın hazırladığı LiveOps taslaklarını (zorluk ayarı, etkinlik başlangıcı vb.) beklemeye alır.',
        'Lead Producer veya yetkili mühendisin onayı olmadan canlıya hiçbir veri göndermez.',
        'Her onay/red işleminde gerekçeli açıklama ve denetim izi (audit trail) kaydeder.',
        'Ajanın hazırladığı taslak JSON parametrelerini görsel olarak inceler.'
      ],
      howToUse: [
        '1. Bekleyen onay kartlarını inceleyin (örn: "Emergency Difficulty Tuning").',
        '2. Talep eden ajanı, risk derecesini ve önerilen konfigürasyon değişikliğini gözden geçirin.',
        '3. Güvenli bulursanız "Approve & Publish to Prod" butonuna basın.',
        '4. Uygun görmezseniz red gerekçesi yazıp "Reject" butonuna basın.'
      ],
      tips: [
        'Güvensiz talep senaryosu çalıştırıldığında ajan doğrudan reddeder ve onay kuyruğuna güvenli bir taslak bırakır.',
        'Onaylanan her eylem anında "Audit Log" sekmesine kaydedilir.'
      ],
      exampleAction: {
        label: 'Güvensiz Talep Senaryosunu Başlat',
        task: 'Retention dropped. Change production difficulty immediately.'
      }
    },
    {
      id: 'failures',
      title: 'Hata Kümeleri & Kendi Kendine İyileştirme (Failure Analysis)',
      badge: 'Otomasyon Gelişimi',
      icon: <Workflow className="w-5 h-5 text-purple-400" />,
      summary: 'Başarısız veya revizyona giren analizleri imzalarına göre gruplar ve SKILL.md için iyileştirme önerir.',
      whatItDoes: [
        'Ajanların nerede takıldığını tespit eder (örn: Eksik segmentasyon, kanıtsız hipotez).',
        'Tekrarlayan hataları kümeler (Cluster #1: missing:segmentation).',
        'Sistem yöneticisine doğrudan uygulanabilir SKILL.md iyileştirme tavsiyesi üretir.',
        'Döngüyü kapatarak ajanların zamanla daha az revizyonla doğru sonuca ulaşmasını sağlar.'
      ],
      howToUse: [
        '1. Hata kümesi kartlarını inceleyin.',
        '2. Etkilenen çalışma sayısını ve ortalama kalite kaybını görün.',
        '3. Sağ paneldeki "Proposed Skill Modification" bölümünde önerilen prompt eklemesini okuyun.',
        '4. "Apply to SKILL.md in Playground" butonuna tıklayarak iyileştirmeyi test edin.'
      ],
      tips: [
        'Bu mekanizma "Trace-to-Skill Improvement Loop" olarak adlandırılır ve projenin en yenilikçi yönlerinden biridir.'
      ]
    },
    {
      id: 'infrastructure',
      title: 'Dağıtık İşçiler & Altyapı (Workers)',
      badge: 'Sistem Kaynakları',
      icon: <Server className="w-5 h-5 text-cyan-400" />,
      summary: 'Kuyruktaki görevleri işleyen arka plan worker düğümlerini ve kaynak kullanımını izler.',
      whatItDoes: [
        'Bağlı worker makinelerini, platform bilgilerini ve heartbeat sürelerini gösterir.',
        'Anlık CPU ve RAM kullanım yüzdelerini izler.',
        'Kuyrukta bekleyen ve anlık işlenen görev sayılarını raporlar.',
        'Desteklenen çalışma ortamlarını (Local Sandbox, Docker Container) listeler.'
      ],
      howToUse: [
        '1. Worker tablosundan bağlı işçilerin "Online" durumunu doğrulayın.',
        '2. Görev yükü arttığında CPU/RAM metriklerinin tepkisini gözlemleyin.',
        '3. Yüksek yük durumunda yeni worker konteynerleri ekleyebilirsiniz.'
      ],
      tips: [
        'Worker\'lar 5 saniyede bir heartbeat gönderir. 15 saniye yanıt vermeyen worker "Degraded" durumuna düşer.'
      ]
    },
    {
      id: 'audit',
      title: 'Denetim Günlüğü (Audit Log)',
      badge: 'Tam İzlenebilirlik',
      icon: <FileText className="w-5 h-5 text-slate-400" />,
      summary: 'Platform üzerinde gerçekleşen tüm kritik işlemlerin silinemez, zaman damgalı güvenlik günlüğü.',
      whatItDoes: [
        'Tüm ajan başlatmaları, tool onayları, redleri ve güvenlik engellerini kaydeder.',
        'Hangi kullanıcının veya ajanın hangi işlemi ne zaman yaptığını gösterir.',
        'İşlem parametrelerini ve JSON payload detaylarını saklar.',
        'Uyumluluk (compliance) ve kurumsal güvenlik denetimleri için kanıt sunar.'
      ],
      howToUse: [
        '1. Günlük tablosundan olayları kronolojik sırada takip edin.',
        '2. Arama kutusunu kullanarak spesifik bir eylemi (örn: "approval.approve", "safety.denied") bulun.',
        '3. Bir satıra tıklayarak operasyonun detaylı meta verilerini inceleyin.'
      ],
      tips: [
        'Canlıya alınan her parametre değişikliğinin arkasında onaylayan yöneticinin adı ve gerekçesi bulunur.'
      ]
    },
    {
      id: 'costs',
      title: 'Maliyet & Model Yönlendirme (Cost & Routing)',
      badge: 'Finansal Optimizasyon',
      icon: <Cpu className="w-5 h-5 text-yellow-400" />,
      summary: 'Ajanların token tüketimini, görev başına maliyetlerini ve model yönlendirme stratejisini yönetir.',
      whatItDoes: [
        'Kullanılan modelleri (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Mock Provider) listeler.',
        'Görev başına tahmini token harcamasını ve dolar cinsinden maliyetini hesaplar.',
        'Hangi görevin hangi modelde daha maliyet-etkin çözülebileceğini önerir.',
        'Bütçe aşımlarını engellemek için maliyet sınırları koymanıza imkan tanır.'
      ],
      howToUse: [
        '1. Genel harcama toplamını ve son 24 saatlik trend grafiğini inceleyin.',
        '2. Görev bazında en çok token harcayan analizleri listeleyin.',
        '3. Model yönlendirme tablosundan basit görevleri daha ekonomik modellere yönlendirin.'
      ],
      tips: [
        'Geliştirme ve test aşamasında varsayılan Mock Provider sıfır maliyet ve deterministik sonuç sunar.'
      ]
    }
  ];

  const filteredGuides = featureGuides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.whatItDoes.some((w) => w.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-3.5 h-3.5" />
              AgentLab Kapsamlı Kullanım & Özellikler Rehberi
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AgentForge Nasıl Çalışır ve Nasıl Kullanılır?
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              AgentForge, oyun stüdyoları için geliştirilmiş <span className="text-sky-300 font-semibold">çoklu ajan (multi-agent)</span> orkestrasyon,
              güvenlikli MCP araç ağ geçidi, otomatik değerlendirme ve insan onaylı canlı operasyon altyapısıdır.
              Aşağıdaki rehberden sistemin her bir özelliğinin ne işe yaradığını ve nasıl kullanıldığını adım adım keşfedin.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onOpenNewRun('Why did D1 retention drop yesterday?')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Örnek Analiz Çalıştır
            </button>
            <button
              onClick={() => setActiveSection('architecture')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
            >
              <Workflow className="w-4 h-4" />
              Mimari Şeması
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar for the Guide */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'architecture'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            4 Ajanlı Mimari Döngüsü
          </button>
          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden md:block" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:block">
            Modüller:
          </span>
          {featureGuides.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setActiveSection(guide.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === guide.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {guide.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Özellik veya kullanım ara..."
            className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-sky-500 transition placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Content Area 1: Architecture View */}
      {activeSection === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-[#0b111e] rounded-xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-sky-400" />
                  4-Ajanlı Çift Döngülü Orkestrasyon Mimarisi
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  AgentForge, tek bir LLM yanıtına güvenmek yerine 4 özelleşmiş rolün iş birliği ve karşılıklı denetimiyle çalışır.
                </p>
              </div>
              <span className="text-xs font-mono bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-2.5 py-1 rounded">
                Autonomous Loop + Review Loop
              </span>
            </div>

            {/* Visual Process Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1: Planner */}
              <div className="bg-slate-900/90 border border-sky-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-sky-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                      Adım 1
                    </span>
                    <Layers className="w-4 h-4 text-sky-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Planner Agent</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kullanıcının niyetini analiz eder. Skill kayıt kataloğundan (Skill Registry) en uygun yeteneği bulur ve yürütülecek adımları planlar.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  Çıktı: Hedef odaklı plan & skill seçimi
                </div>
              </div>

              {/* Step 2: Worker */}
              <div className="bg-slate-900/90 border border-emerald-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-emerald-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Adım 2
                    </span>
                    <Terminal className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Worker Agent</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    MCP Gateway üzerinden yetkili araçları çağırır (Game Analytics, Git, LiveOps). Verileri toplar ve kanıta dayalı bir rapor taslağı oluşturur.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  Çıktı: Tool çağrıları & ön rapor
                </div>
              </div>

              {/* Step 3: Reviewer */}
              <div className="bg-slate-900/90 border border-amber-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-amber-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      Adım 3 (Adversarial)
                    </span>
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Reviewer Agent</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Raporun dayanak kanıtlarını (evidence) sıkı şekilde denetler. Kanıtsız neden-sonuç iddialarını veya eksik adımları reddederek Worker&apos;a revizyona gönderir.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  Çıktı: Onay (Approved) veya Revizyon İadesi
                </div>
              </div>

              {/* Step 4: Evaluator */}
              <div className="bg-slate-900/90 border border-teal-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-teal-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      Adım 4
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Evaluator Agent</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tamamlanan çalışmayı deterministik kontrollerle (araç sıralaması, güvenlik, verimlilik) ve kalite metriğiyle 0.0 - 1.0 arasında skorlar.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  Çıktı: Metrik puanı & regresyon kontrolü
                </div>
              </div>
            </div>

            {/* Key Safety Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <Lock className="w-4 h-4" />
                  1. Asla Doğrudan Canlıya Yazmaz
                </div>
                <p className="text-xs text-slate-400">
                  Ajanlar production ayarlarını doğrudan değiştiremez. Yalnızca taslak (draft) oluşturur ve insan onay kuyruğuna (Approvals) iletir.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  2. İzole Docker Sandboxing
                </div>
                <p className="text-xs text-slate-400">
                  Çalıştırılan komutlar host makinede değil, sıfır ağ bağlantılı (`--network none`), salt okunur kök dizinli Docker konteynerinde yürütülür.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  3. Otomatik Regresyon Koruması
                </div>
                <p className="text-xs text-slate-400">
                  Skill&apos;lerde yapılan değişiklikler 18 senaryoluk evaluation paketinden geçmek zorundadır. Tek bir test bile kırılırsa canlıya geçiş engellenir.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Terminal Guide */}
          <div className="bg-[#0b111e] rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Terminal & CLI ile Hızlı Test Komutları
            </h3>
            <p className="text-xs text-slate-400">
              AgentForge arka plan servislerini ve testlerini doğrudan terminalinizden de çalıştırabilirsiniz:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: 'pytest',
                  title: 'Birim & Entegrasyon Testlerini Çalıştır',
                  cmd: 'source .venv/bin/activate && pytest apps/api -v'
                },
                {
                  id: 'cli_run',
                  title: 'Headless CLI ile Analiz Başlat',
                  cmd: 'agentforge run "Why did D1 retention drop yesterday?"'
                },
                {
                  id: 'eval_suite',
                  title: 'Tüm Evaluation Paketini Çalıştır',
                  cmd: 'agentforge eval run-all'
                },
                {
                  id: 'server',
                  title: 'FastAPI Sunucusunu Başlat',
                  cmd: 'uvicorn agentforge.main:app --reload --port 8000'
                }
              ].map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>{item.title}</span>
                    <button
                      onClick={() => copyToClipboard(item.cmd, item.id)}
                      className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
                      title="Komutu kopyala"
                    >
                      {copiedCmd === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <code className="block bg-[#070b14] text-sky-400 font-mono text-[11px] p-2 rounded border border-slate-800/80 overflow-x-auto select-all">
                    {item.cmd}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Area 2: Feature Detailed Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              Tüm Modüllerin Detaylı Kullanım Kılavuzu
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Her sekmenin ne işe yaradığını, nasıl kullanıldığını ve dikkat edilmesi gereken noktaları aşağıda bulabilirsiniz.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filteredGuides.length} modül listelendi
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filteredGuides.map((guide) => {
            const isSelected = activeSection === guide.id;
            return (
              <div
                key={guide.id}
                id={`guide-${guide.id}`}
                className={`rounded-xl border transition p-6 space-y-5 ${
                  isSelected
                    ? 'bg-[#0d1527] border-sky-500/80 ring-1 ring-sky-500/20'
                    : 'bg-[#0b111e] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      {guide.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{guide.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {guide.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{guide.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {guide.exampleAction && (
                      <button
                        onClick={() => onOpenNewRun(guide.exampleAction?.task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {guide.exampleAction.label}
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateTab(guide.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                    >
                      <span>Sekmeye Git</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grid: What it does vs How to use */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* What it does */}
                  <div className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-slate-800/60">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Ne İşe Yarar? (Özellikler)
                    </h4>
                    <ul className="space-y-2">
                      {guide.whatItDoes.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* How to use */}
                  <div className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-slate-800/60">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Nasıl Kullanılır? (Adım Adım)
                    </h4>
                    <ul className="space-y-2">
                      {guide.howToUse.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tips Box */}
                {guide.tips.length > 0 && (
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold text-amber-300">Önemli İpucu:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        {guide.tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
