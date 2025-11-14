'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileSearch, Zap, Shield, BarChart3, Globe, Lock, Sparkles } from 'lucide-react';

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
      className="py-20 bg-muted/50"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features for Document Intelligence</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to extract insights from your documents
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
