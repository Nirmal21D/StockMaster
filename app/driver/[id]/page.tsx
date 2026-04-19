import DriverClient from './DriverClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Driver Dispatch | SupplyMind AI',
  description: 'Mobile interface for real-time shipment tracking and HOS management.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function DriverPage({ params }: { params: { id: string } }) {
  return <DriverClient shipmentId={params.id} />;
}
