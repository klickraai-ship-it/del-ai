
import React from 'react';
import { DashboardData } from '../types';
import KPITile from './KPITile';
import SpamRateGauge from './SpamRateGauge';
import ComplianceChecklist from './ComplianceChecklist';
import DomainPerformanceChart from './DomainPerformanceChart';
import { CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  data: DashboardData;
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  if (!data || !data.kpis) {
    return (
      <div className="text-center text-gray-400 p-8">
        No dashboard data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map((kpi) => (
          <KPITile key={kpi.title} {...kpi} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-1">Gmail Spam Rate (Postmaster)</h3>
          <p className="text-sm text-gray-400 mb-4">User-reported spam. Target: &lt;0.10%</p>
          <SpamRateGauge value={data.gmailSpamRate} />
        </div>
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-1">Performance by Domain</h3>
          <p className="text-sm text-gray-400 mb-4">Key metrics across major mailbox providers.</p>
          {data.domainPerformance && data.domainPerformance.length > 0 ? (
            <DomainPerformanceChart data={data.domainPerformance} />
          ) : (
            <div className="text-center text-gray-500 py-8">No domain performance data available</div>
          )}
        </div>
      </div>
       <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
         <div className="flex items-start mb-4">
            <ShieldCheck className="h-8 w-8 text-brand-blue mr-4 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white">AI Agent: Setup Guardian</h3>
              <p className="text-sm text-gray-400">Real-time audit of your sending configuration against Gmail & Yahoo requirements.</p>
            </div>
         </div>
         {data.complianceChecklist && data.complianceChecklist.length > 0 ? (
           <ComplianceChecklist items={data.complianceChecklist} />
         ) : (
           <div className="text-center text-gray-500 py-8">No compliance data available</div>
         )}
       </div>
    </div>
  );
};

export default Dashboard;
