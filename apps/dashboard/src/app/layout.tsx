import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AgentForge — AI Agent Infrastructure & Evaluation Platform',
  description: 'Enterprise AI Enablement platform for autonomous game studio agents: orchestration, skills, MCP, evaluations and safety sandboxing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body
        className="min-h-full bg-[#070b14] text-slate-100 flex flex-col antialiased selection:bg-sky-500/30 selection:text-sky-200"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
