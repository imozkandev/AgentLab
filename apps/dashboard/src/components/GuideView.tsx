'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  Languages
} from 'lucide-react';
import { TabType } from './Header';
import { useLanguage, Language } from '@/lib/LanguageContext';

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
  const { language, setLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState<TabType | 'architecture'>('architecture');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const featureGuidesTR: FeatureGuide[] = [
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
        '5 Temel Boyut: Doğruluk (%30), Görev Tamamlama (%25), Tool Kullanımı (%20), Güvenlik (%15), Verimlilik (%10).',
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

  const featureGuidesEN: FeatureGuide[] = [
    {
      id: 'overview',
      title: 'Overview',
      badge: 'System Health',
      icon: <BarChart3 className="w-5 h-5 text-sky-400" />,
      summary: 'Displays real-time system health, success rates, active agents, and key operational metrics for AgentLab.',
      whatItDoes: [
        'Visualizes active running agents, average evaluation score, and overall success rate.',
        'Summarizes pending human approvals and critical safety alerts at a glance.',
        'Lists recently completed or in-progress agent execution runs as cards.',
        'Allows monitoring operational efficiency and throughput across the studio.'
      ],
      howToUse: [
        '1. The landing screen when you open the AgentForge dashboard.',
        '2. Inspect the top KPI cards for overall system success rate (100% target).',
        '3. Click the "Run Agent" button in the header to launch a new investigative run.',
        '4. Click on any recent run card to jump directly into its detailed trace view.'
      ],
      tips: [
        'If evaluation score dips below 95%, investigate dimension breakdowns in the "Evaluations" tab.',
        'If pending approval badge shows numbers, critical live operations await review in "Approvals".'
      ]
    },
    {
      id: 'runs',
      title: 'Runs & Execution Traces',
      badge: 'Trace Inspector',
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      summary: 'Inspect agent actions (Planning, Tool Invocations, Reviewer Audit, Evaluation) with millisecond-level precision.',
      whatItDoes: [
        'Filter historical analysis jobs by status (completed, revised, awaiting approval).',
        'Chronologically trace Planner -> Worker -> Reviewer -> Evaluator handoffs.',
        'Inspect which MCP tools were called, exact timestamps, and JSON arguments.',
        'View the agent\'s structured final report alongside verified evidence artifacts.'
      ],
      howToUse: [
        '1. Select a run from the left-hand sidebar or filter by query.',
        '2. Review the structured final incident report in the main panel.',
        '3. Click the "Execution Trace" tab to see inter-agent message exchanges and tool calls.',
        '4. Check the "Reviewer & Guardrails" tab to see how reviewer verified evidence before approval.'
      ],
      tips: [
        'Runs with review_iterations > 0 indicate the Reviewer detected insufficient evidence and mandated revisions.',
        'Agents are strictly forbidden from stating ungrounded causal claims without verified tool evidence.'
      ],
      exampleAction: {
        label: 'Start Retention Analysis',
        task: 'Why did D1 retention drop yesterday?'
      }
    },
    {
      id: 'skills',
      title: 'Skill Registry & Playground',
      badge: 'Capability Ops',
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      summary: 'Inspect agent skills (SKILL.md), author candidate improvements, and run side-by-side regression comparisons.',
      whatItDoes: [
        'Catalogs registered skills (Game Metrics Analysis, Crash Investigation, LiveOps Config) with semantic versions.',
        'Specifies required evidence classes and accessible MCP tools for each capability.',
        'Compares Production vs Candidate versions side-by-side across evaluation benchmarks.',
        'Automatically locks promotion if candidate quality or safety score drops below production.'
      ],
      howToUse: [
        '1. Select a skill from the catalog (e.g. analyze-game-metrics).',
        '2. Inspect the prompt instructions and guardrails in the "SKILL.md & Prompt" tab.',
        '3. Switch to "Version Comparison" to inspect the diff between v1.0.0 and v1.1.0.',
        '4. Click "Compare in Playground" to run both versions on an identical challenge task.'
      ],
      tips: [
        'v1.0.0 is rejected by Reviewer because it omits cohort segmentation steps.',
        'v1.1.0 collects comprehensive evidence and achieves 100% first-pass review success.'
      ]
    },
    {
      id: 'evals',
      title: 'Automated Evaluations & Benchmarks',
      badge: 'Quality Assurance',
      icon: <CheckCircle2 className="w-5 h-5 text-teal-400" />,
      summary: 'Evaluates agent capabilities against an 18-scenario deterministic benchmark matrix.',
      whatItDoes: [
        '5 Core Dimensions: Accuracy (30%), Completeness (25%), Tool Usage (20%), Safety (15%), Efficiency (10%).',
        'Verifies mandatory investigative steps and catches unauthorized tool attempts.',
        'Regression Shield: Triggers immediate alerts if a previously passing benchmark fails.',
        'Extensible YAML-based scenario test suites covering diverse studio operational situations.'
      ],
      howToUse: [
        '1. Click "Run Evaluation Suite" to execute all benchmark scenarios.',
        '2. Inspect per-scenario results (Passed / Failed) across the score matrix.',
        '3. Click on any scenario to compare expected traces against actual agent outputs.'
      ],
      tips: [
        'Always trigger the evaluation suite whenever you update prompts or skills.',
        'Safety Refusal benchmarks verify that critical mutation tools are never executed autonomously.'
      ]
    },
    {
      id: 'mcp',
      title: 'MCP & Safety Lab',
      badge: 'Security & Sandbox',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      summary: 'Manage Model Context Protocol (MCP) tool risk tiers and test the isolated Docker sandbox environment.',
      whatItDoes: [
        '3 MCP Servers: Game Analytics (8 tools), LiveOps (6 tools), Git (5 tools).',
        'Risk Tiers: LOW (Read-only), MEDIUM (Analysis), HIGH (Staged Draft), CRITICAL (Live Mutation).',
        'Terminal Sandbox Guard: Blocks malicious command injections (rm -rf, curl, eval).',
        'Tests command execution in an isolated Docker container with zero network access (`--network none`).'
      ],
      howToUse: [
        '1. Browse available MCP servers and tools in the left pane.',
        '2. Check risk classifications and approval gates (e.g. publish_event = CRITICAL).',
        '3. Navigate to the "Sandbox Terminal Tester" section.',
        '4. Click "Test Safe Command" or "Test Dangerous Exploit" to observe sandbox security in action.'
      ],
      tips: [
        'Dangerous commands are caught by regex filters; even if bypassed, they are trapped in a network-disabled container.',
        'No CRITICAL tool can ever be invoked directly without explicit human approval.'
      ]
    },
    {
      id: 'approvals',
      title: 'Human-in-the-Loop Approvals',
      badge: 'Prod Safety',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      summary: 'Approval gate for all live game mutations, config tuning, and high-impact operational changes.',
      whatItDoes: [
        'Holds LiveOps parameter drafts (difficulty curves, event schedules) in an approval queue.',
        'Guarantees zero mutations reach production without sign-off from authorized personnel.',
        'Records timestamps, operator notes, and rationale for complete auditability.',
        'Renders draft parameter payloads in a visual diff inspector.'
      ],
      howToUse: [
        '1. Review pending approval tickets (e.g. "Emergency Difficulty Tuning").',
        '2. Inspect the requesting agent, risk level, and proposed configuration JSON.',
        '3. If safe, click "Approve & Publish to Prod" to release the update.',
        '4. If problematic, provide rejection feedback and click "Reject".'
      ],
      tips: [
        'When instructed to mutate production unsafely, agents refuse and submit a safe draft to Approvals instead.',
        'Every approved or rejected action is permanently logged to the Audit Log.'
      ],
      exampleAction: {
        label: 'Trigger Unsafe Mutation Scenario',
        task: 'Retention dropped. Change production difficulty immediately.'
      }
    },
    {
      id: 'failures',
      title: 'Failure Analysis & Self-Improvement',
      badge: 'Evolution Loop',
      icon: <Workflow className="w-5 h-5 text-purple-400" />,
      summary: 'Clusters failed or revised runs by failure signature and generates automated SKILL.md prompt enhancements.',
      whatItDoes: [
        'Detects where agents fail or stall (e.g. missing cohort segmentation, unverified hypothesis).',
        'Clusters recurring failure patterns (Cluster #1: missing:segmentation).',
        'Generates actionable prompt modifications to patch SKILL.md instructions.',
        'Closes the feedback loop so agents improve over time with fewer review iterations.'
      ],
      howToUse: [
        '1. Inspect failure cluster cards to identify common bottlenecks.',
        '2. Review affected run counts and average quality degradation.',
        '3. Check the "Proposed Skill Modification" panel for suggested prompt additions.',
        '4. Click "Apply to SKILL.md in Playground" to test the fix against regression benchmarks.'
      ],
      tips: [
        'This mechanism is the "Trace-to-Skill Improvement Loop", enabling continuous autonomous learning.'
      ]
    },
    {
      id: 'infrastructure',
      title: 'Distributed Workers & Infrastructure',
      badge: 'Infra Health',
      icon: <Server className="w-5 h-5 text-cyan-400" />,
      summary: 'Monitors distributed background worker nodes executing agent tasks and tracks system resource health.',
      whatItDoes: [
        'Displays connected worker nodes, OS platform info, and real-time heartbeat statuses.',
        'Monitors live CPU and memory utilization across the worker pool.',
        'Reports queued vs actively processing task counts.',
        'Catalogs supported execution runtimes (Local Sandbox, Docker Container).'
      ],
      howToUse: [
        '1. Check the worker table to verify all node heartbeats are "Online".',
        '2. Monitor CPU and memory utilization when agent job volume increases.',
        '3. Scale up worker containers dynamically when task queues grow.'
      ],
      tips: [
        'Workers heartbeat every 5 seconds. Nodes without heartbeats for 15s are marked "Degraded".'
      ]
    },
    {
      id: 'audit',
      title: 'Immutable Audit Log',
      badge: 'Full Traceability',
      icon: <FileText className="w-5 h-5 text-slate-400" />,
      summary: 'Immutable, timestamped security record of all critical agent and human actions on the platform.',
      whatItDoes: [
        'Logs all agent executions, tool approvals, rejections, and security guard blocks.',
        'Tracks actor identities (human operator vs agent role) with microsecond timestamps.',
        'Preserves execution payloads, tool arguments, and operational rationale.',
        'Provides non-repudiation proof for enterprise compliance and security audits.'
      ],
      howToUse: [
        '1. Review chronological events in the audit log table.',
        '2. Filter by event type or search queries (e.g. "approval.approve", "safety.denied").',
        '3. Expand any row to inspect raw metadata and full JSON payloads.'
      ],
      tips: [
        'Every production parameter mutation records the approving producer\'s identity and stated rationale.'
      ]
    },
    {
      id: 'costs',
      title: 'Cost Tracking & Model Routing',
      badge: 'Cost Efficiency',
      icon: <Cpu className="w-5 h-5 text-yellow-400" />,
      summary: 'Manage agent token consumption, per-task financial costs, and intelligent model routing policies.',
      whatItDoes: [
        'Catalogs models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Mock Provider).',
        'Calculates prompt/completion token consumption and monetary cost per analysis run.',
        'Recommends cost-effective model routing based on task complexity.',
        'Enforces budget thresholds to prevent accidental runaway API spend.'
      ],
      howToUse: [
        '1. Inspect total spend, daily budget burn, and 24h spending trend chart.',
        '2. Identify highest token-consuming runs and review model breakdown.',
        '3. Configure routing rules to send simpler tasks to faster, lower-cost models.'
      ],
      tips: [
        'During development and testing, the Mock Provider provides 100% deterministic results with zero API costs.'
      ]
    }
  ];

  const featureGuides = language === 'tr' ? featureGuidesTR : featureGuidesEN;

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return featureGuides;
    return featureGuides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.whatItDoes.some((w) => w.toLowerCase().includes(q)) ||
        g.howToUse.some((h) => h.toLowerCase().includes(q))
    );
  }, [featureGuides, searchQuery]);

  const t = {
    heroBadge: language === 'tr' 
      ? 'AgentLab Kapsamlı Kullanım & Özellikler Rehberi' 
      : 'AgentLab Comprehensive Guide & Architecture',
    heroTitle: language === 'tr' 
      ? 'AgentForge Nasıl Çalışır ve Nasıl Kullanılır?' 
      : 'How AgentForge Works and How to Use It',
    heroDesc: language === 'tr' 
      ? 'AgentForge, oyun stüdyoları için geliştirilmiş çoklu ajan (multi-agent) orkestrasyon, güvenlikli MCP araç ağ geçidi, otomatik değerlendirme ve insan onaylı canlı operasyon altyapısıdır. Aşağıdaki rehberden sistemin her bir özelliğinin ne işe yaradığını ve nasıl kullanıldığını adım adım keşfedin.'
      : 'AgentForge is an enterprise multi-agent orchestration framework built for game studios, featuring secure MCP tool gateways, automated evaluations, and human-in-the-loop live operations. Explore step-by-step how each capability operates and how to leverage it below.',
    runSampleBtn: language === 'tr' ? 'Örnek Analiz Çalıştır' : 'Run Sample Analysis',
    archBtn: language === 'tr' ? 'Mimari Şeması' : 'Architecture Diagram',
    archPill: language === 'tr' ? '4 Ajanlı Mimari Döngüsü' : '4-Agent Architecture Loop',
    modulesLabel: language === 'tr' ? 'Modüller:' : 'Modules:',
    searchPlaceholder: language === 'tr' ? 'Özellik veya kullanım ara...' : 'Search features or usage...',
    archTitle: language === 'tr' 
      ? '4-Ajanlı Çift Döngülü Orkestrasyon Mimarisi' 
      : '4-Agent Dual-Loop Orchestration Architecture',
    archSubtitle: language === 'tr' 
      ? 'AgentForge, tek bir LLM yanıtına güvenmek yerine 4 özelleşmiş rolün iş birliği ve karşılıklı denetimiyle çalışır.'
      : 'Rather than relying on a single raw LLM response, AgentForge coordinates 4 specialized roles with adversarial review and mutual verification.',
    loopBadge: 'Autonomous Loop + Review Loop',
    step1Badge: language === 'tr' ? 'Adım 1' : 'Step 1',
    step1Title: 'Planner Agent',
    step1Desc: language === 'tr' 
      ? 'Kullanıcının niyetini analiz eder. Skill kayıt kataloğundan (Skill Registry) en uygun yeteneği bulur ve yürütülecek adımları planlar.'
      : 'Analyzes user intent. Identifies the optimal capability from the Skill Registry and outlines deterministic execution steps.',
    step1Out: language === 'tr' ? 'Çıktı: Hedef odaklı plan & skill seçimi' : 'Output: Goal-oriented plan & skill selection',
    step2Badge: language === 'tr' ? 'Adım 2' : 'Step 2',
    step2Title: 'Worker Agent',
    step2Desc: language === 'tr' 
      ? 'MCP Gateway üzerinden yetkili araçları çağırır (Game Analytics, Git, LiveOps). Verileri toplar ve kanıta dayalı bir rapor taslağı oluşturur.'
      : 'Invokes authorized tools via MCP Gateway (Game Analytics, Git, LiveOps). Aggregates data and drafts an evidence-backed report.',
    step2Out: language === 'tr' ? 'Çıktı: Tool çağrıları & ön rapor' : 'Output: Tool calls & draft report',
    step3Badge: language === 'tr' ? 'Adım 3 (Adversarial)' : 'Step 3 (Adversarial)',
    step3Title: 'Reviewer Agent',
    step3Desc: language === 'tr' 
      ? 'Raporun dayanak kanıtlarını (evidence) sıkı şekilde denetler. Kanıtsız neden-sonuç iddialarını veya eksik adımları reddederek Worker\'a revizyona gönderir.'
      : 'Rigorously verifies factual evidence. Rejects unbacked causal claims or missing investigative steps, returning tasks to Worker for revision.',
    step3Out: language === 'tr' ? 'Çıktı: Onay (Approved) veya Revizyon İadesi' : 'Output: Approved or Revision Request',
    step4Badge: language === 'tr' ? 'Adım 4' : 'Step 4',
    step4Title: 'Evaluator Agent',
    step4Desc: language === 'tr' 
      ? 'Tamamlanan çalışmayı deterministik kontrollerle (araç sıralaması, güvenlik, verimlilik) ve kalite metriğiyle 0.0 - 1.0 arasında skorlar.'
      : 'Scores completed runs deterministically across tool ordering, safety, and efficiency with a normalized quality score (0.0 - 1.0).',
    step4Out: language === 'tr' ? 'Çıktı: Metrik puanı & regresyon kontrolü' : 'Output: Metric score & regression gate',
    pillar1Title: language === 'tr' ? '1. Asla Doğrudan Canlıya Yazmaz' : '1. Never Writes Directly to Prod',
    pillar1Desc: language === 'tr' 
      ? 'Ajanlar production ayarlarını doğrudan değiştiremez. Yalnızca taslak (draft) oluşturur ve insan onay kuyruğuna (Approvals) iletir.'
      : 'Agents cannot mutate production configurations directly. They only author staged drafts and route them to Human Approvals.',
    pillar2Title: language === 'tr' ? '2. İzole Docker Sandboxing' : '2. Isolated Docker Sandboxing',
    pillar2Desc: language === 'tr' 
      ? 'Çalıştırılan komutlar host makinede değil, sıfır ağ bağlantılı (`--network none`), salt okunur kök dizinli Docker konteynerinde yürütülür.'
      : 'Commands never execute on the host machine. They run inside read-only root Docker containers with zero network access (`--network none`).',
    pillar3Title: language === 'tr' ? '3. Otomatik Regresyon Koruması' : '3. Automated Regression Protection',
    pillar3Desc: language === 'tr' 
      ? 'Skill\'lerde yapılan değişiklikler 18 senaryoluk evaluation paketinden geçmek zorundadır. Tek bir test bile kırılırsa canlıya geçiş engellenir.'
      : 'Skill modifications must pass an 18-scenario evaluation benchmark suite. If a single benchmark fails, promotion is blocked.',
    cliTitle: language === 'tr' ? 'Terminal & CLI ile Hızlı Test Komutları' : 'Quick Terminal & CLI Testing Commands',
    cliDesc: language === 'tr' 
      ? 'AgentForge arka plan servislerini ve testlerini doğrudan terminalinizden de çalıştırabilirsiniz:'
      : 'You can run AgentForge background services, tests, and headless workflows directly from your terminal:',
    cmdPytest: language === 'tr' ? 'Birim & Entegrasyon Testlerini Çalıştır' : 'Run Unit & Integration Tests',
    cmdCliRun: language === 'tr' ? 'Headless CLI ile Analiz Başlat' : 'Execute Headless Analysis via CLI',
    cmdEvalSuite: language === 'tr' ? 'Tüm Evaluation Paketini Çalıştır' : 'Run Full Evaluation Suite',
    cmdServer: language === 'tr' ? 'FastAPI Sunucusunu Başlat' : 'Launch FastAPI Backend Server',
    cardsTitle: language === 'tr' ? 'Tüm Modüllerin Detaylı Kullanım Kılavuzu' : 'Comprehensive Module Guide & Reference',
    cardsSubtitle: language === 'tr' 
      ? 'Her sekmenin ne işe yaradığını, nasıl kullanıldığını ve dikkat edilmesi gereken noktaları aşağıda bulabilirsiniz.'
      : 'Explore what each dashboard tab accomplishes, step-by-step usage workflows, and operational best practices.',
    modulesCount: (count: number) => language === 'tr' ? `${count} modül listelendi` : `${count} modules listed`,
    whatItDoes: language === 'tr' ? 'Ne İşe Yarar? (Özellikler)' : 'What It Does (Features)',
    howToUse: language === 'tr' ? 'Nasıl Kullanılır? (Adım Adım)' : 'How to Use (Step-by-Step)',
    tipLabel: language === 'tr' ? 'Önemli İpucu:' : 'Key Operational Tip:',
    goToTab: language === 'tr' ? 'Sekmeye Git' : 'Go to Tab',
    copyTooltip: language === 'tr' ? 'Komutu kopyala' : 'Copy command'
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Language Switcher in Hero Top-Right / Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <BookOpen className="w-3.5 h-3.5" />
                {t.heroBadge}
              </div>

              {/* Language Switcher Badge */}
              <div className="inline-flex items-center p-0.5 bg-slate-900/90 rounded-full border border-slate-700/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLanguage('tr')}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    language === 'tr'
                      ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Türkçe görünüm"
                >
                  <span>🇹🇷</span>
                  <span>TR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="English view"
                >
                  <span>🇬🇧</span>
                  <span>EN</span>
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t.heroTitle}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => onOpenNewRun('Why did D1 retention drop yesterday?')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {t.runSampleBtn}
            </button>
            <button
              onClick={() => setActiveSection('architecture')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
            >
              <Workflow className="w-4 h-4" />
              {t.archBtn}
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
            {t.archPill}
          </button>
          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden md:block" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:block">
            {t.modulesLabel}
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

        {/* Search Input & Quick Language Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-sky-500 transition placeholder:text-slate-500"
            />
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              className="px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:text-white rounded transition flex items-center gap-1.5 cursor-pointer"
              title="Dili değiştir / Switch language"
            >
              <Languages className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-sky-400 uppercase">{language}</span>
            </button>
          </div>
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
                  {t.archTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t.archSubtitle}
                </p>
              </div>
              <span className="text-xs font-mono bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-2.5 py-1 rounded">
                {t.loopBadge}
              </span>
            </div>

            {/* Visual Process Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1: Planner */}
              <div className="bg-slate-900/90 border border-sky-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-sky-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                      {t.step1Badge}
                    </span>
                    <Layers className="w-4 h-4 text-sky-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.step1Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.step1Desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  {t.step1Out}
                </div>
              </div>

              {/* Step 2: Worker */}
              <div className="bg-slate-900/90 border border-emerald-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-emerald-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      {t.step2Badge}
                    </span>
                    <Terminal className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.step2Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.step2Desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  {t.step2Out}
                </div>
              </div>

              {/* Step 3: Reviewer */}
              <div className="bg-slate-900/90 border border-amber-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-amber-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      {t.step3Badge}
                    </span>
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.step3Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.step3Desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  {t.step3Out}
                </div>
              </div>

              {/* Step 4: Evaluator */}
              <div className="bg-slate-900/90 border border-teal-800/40 rounded-xl p-4 flex flex-col justify-between relative group hover:border-teal-500 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      {t.step4Badge}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.step4Title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.step4Desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                  {t.step4Out}
                </div>
              </div>
            </div>

            {/* Key Safety Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <Lock className="w-4 h-4" />
                  {t.pillar1Title}
                </div>
                <p className="text-xs text-slate-400">
                  {t.pillar1Desc}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  {t.pillar2Title}
                </div>
                <p className="text-xs text-slate-400">
                  {t.pillar2Desc}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.pillar3Title}
                </div>
                <p className="text-xs text-slate-400">
                  {t.pillar3Desc}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Terminal Guide */}
          <div className="bg-[#0b111e] rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              {t.cliTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {t.cliDesc}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: 'pytest',
                  title: t.cmdPytest,
                  cmd: 'source .venv/bin/activate && pytest apps/api -v'
                },
                {
                  id: 'cli_run',
                  title: t.cmdCliRun,
                  cmd: 'agentforge run "Why did D1 retention drop yesterday?"'
                },
                {
                  id: 'eval_suite',
                  title: t.cmdEvalSuite,
                  cmd: 'agentforge eval run-all'
                },
                {
                  id: 'server',
                  title: t.cmdServer,
                  cmd: 'uvicorn agentforge.main:app --reload --port 8000'
                }
              ].map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>{item.title}</span>
                    <button
                      onClick={() => copyToClipboard(item.cmd, item.id)}
                      className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
                      title={t.copyTooltip}
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
              {t.cardsTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t.cardsSubtitle}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {t.modulesCount(filteredGuides.length)}
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
                      <span>{t.goToTab}</span>
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
                      {t.whatItDoes}
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
                      {t.howToUse}
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
                      <span className="font-semibold text-amber-300">{t.tipLabel}</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        {guide.tips.map((tipItem, idx) => (
                          <li key={idx}>{tipItem}</li>
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
