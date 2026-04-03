import { useQuery } from '@tanstack/react-query';
import { Building2, Activity, PieChart as PieChartIcon, ShieldCheck, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '@/services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Global statistics across all tenants and infrastructure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{stats?.activeCompanies}</span> currently active
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeConnections}</div>
            <p className="text-xs text-muted-foreground mt-1 italic">Cached tenant DB connections</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trials Status</CardTitle>
            <ShieldCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.trialCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-500 font-medium">{stats?.expiredTrials}</span> trials have expired
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono text-[16px] ${(stats?.activeConnections || 0) > 0 ? 'text-green-500' : 'text-amber-500'}`}>
              {(stats?.activeConnections || 0) > 0 ? 'OPERATIONAL' : 'QUIET'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold opacity-70">
              {stats?.activeConnections || 0} ACTIVE DB POOLS
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Subscription Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.planDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="plan" />
                <YAxis />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Quick Summary</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center items-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: stats?.activeCompanies },
                    { name: 'Inactive', value: stats?.inactiveCompanies },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-l-4 border-l-yellow-500 shadow-sm">
        <CardContent className="flex items-center gap-4 py-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong>Maintenance Note:</strong> Tenant database storage is monitoring via background jobs. Monthly invoices are generated on the 1st of every month automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
