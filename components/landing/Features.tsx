'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileSearch, Zap, Shield, BarChart3, Globe } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Q&A',
    description:
      'Ask questions about your documents and get instant, accurate answers powered by GPT-4, Claude, and Gemini.',
  },
  {
    icon: FileSearch,
    title: 'Multi-Format Support',
    description: 'Process PDFs, DOCX, Excel files, and even scanned documents with OCR technology.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process 100-page documents in under 30 seconds with our optimized RAG pipeline.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents are encrypted and stored securely. We never share your data with third parties.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Extract entities, analyze sentiment, and visualize insights with interactive dashboards.',
  },
  {
    icon: Globe,
    title: 'Multi-Model AI',
    description: 'Intelligent model selection with automatic fallback ensures reliable answers every time.',
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-32 bg-background"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">Your AI-Powered Research Partner</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="h-full border border-border/50 bg-background hover:border-border transition-colors"
              >
                <CardHeader className="pb-4">
                  <div className="p-2 w-fit mb-4">
                    <Icon className="h-6 w-6 text-foreground/70" />
                  </div>
                  <CardTitle className="text-xl mb-3 text-foreground">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed text-foreground/70">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
