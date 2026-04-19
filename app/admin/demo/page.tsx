import DemoClient from './DemoClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pitch Director | SupplyMind AI',
  description: 'Scenario orchestration for the Phase 1 pitch recording.',
};

export default function DemoPage() {
  return <DemoClient />;
}
